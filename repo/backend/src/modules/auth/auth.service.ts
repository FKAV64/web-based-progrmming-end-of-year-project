import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const LOCKOUT_MAX_ATTEMPTS = 10;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

/**
 * Authentication service handling user registration, login,
 * token issuance, refresh rotation, and session termination.
 *
 * Security model:
 * - Passwords hashed with Argon2id (timeCost=12, memoryCost=64 MB)
 * - Access tokens expire in 15 minutes (stateless JWT)
 * - Refresh tokens expire in 7 days, stored as SHA-256 hashes in the DB
 * - Refresh rotation: each use issues a new pair and revokes the old one
 * - Brute-force protection: account locked for 15 min after 10 failed attempts
 *
 * @module AuthService
 * @see AuditService
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Registers a new user account and issues an initial token pair.
   *
   * Creates the user row, hashes the password with Argon2id, creates a
   * default UserSettings row, issues an access + refresh token pair, and
   * writes an audit log entry.
   *
   * @param dto - Registration data (email, password, optional display name)
   * @param ip - Client IP address recorded in the audit log
   * @param ua - User-Agent header recorded in the audit log
   * @returns Token pair and the created user (without passwordHash)
   * @throws ConflictException if the email address is already registered
   */
  async register(dto: RegisterDto, ip: string, ua: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      timeCost: Number(this.config.get('ARGON2_TIME_COST') ?? 12),
      memoryCost: Number(this.config.get('ARGON2_MEMORY_COST') ?? 65536),
    });

    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name },
    });

    await this.prisma.userSettings.create({ data: { userId: user.id } });

    const tokens = await this.issueTokenPair(
      user.id,
      user.email,
      user.role,
      ip,
      ua,
    );
    await this.audit.log('auth.register', user.id, ip, ua);

    return { user: this.sanitizeUser(user), ...tokens };
  }

  /**
   * Authenticates a user with email and password.
   *
   * Verifies the Argon2id hash, enforces the brute-force lockout window,
   * resets the failed-attempt counter on success, and issues a fresh token
   * pair. All outcomes (success, failure, lockout) are written to the audit log.
   *
   * @param dto - Login credentials (email, password)
   * @param ip - Client IP address recorded in the audit log
   * @param ua - User-Agent header recorded in the audit log
   * @returns Token pair and the authenticated user (without passwordHash)
   * @throws UnauthorizedException if credentials are invalid
   * @throws HttpException (429) if the account is temporarily locked out
   */
  async login(dto: LoginDto, ip: string, ua: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      await this.audit.log('auth.login_failed', undefined, ip, ua, {
        email: dto.email,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit.log('auth.login_locked', user.id, ip, ua);
      throw new HttpException(
        'Account temporarily locked. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      await this.recordFailedAttempt(
        user.id,
        user.lastFailedLoginAt,
        user.failedLoginAttempts,
      );
      await this.audit.log('auth.login_failed', user.id, ip, ua);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lastFailedLoginAt: null,
          lockedUntil: null,
        },
      });
    }

    const tokens = await this.issueTokenPair(
      user.id,
      user.email,
      user.role,
      ip,
      ua,
    );
    await this.audit.log('auth.login_success', user.id, ip, ua);

    return { user: this.sanitizeUser(user), ...tokens };
  }

  private async recordFailedAttempt(
    userId: string,
    lastFailedAt: Date | null | undefined,
    currentCount: number | undefined,
  ) {
    const now = new Date();
    const windowStillOpen =
      !!lastFailedAt &&
      now.getTime() - lastFailedAt.getTime() < LOCKOUT_WINDOW_MS;
    const nextCount = windowStillOpen ? (currentCount ?? 0) + 1 : 1;
    const reachedThreshold = nextCount >= LOCKOUT_MAX_ATTEMPTS;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: reachedThreshold ? 0 : nextCount,
        lastFailedLoginAt: now,
        lockedUntil: reachedThreshold
          ? new Date(now.getTime() + LOCKOUT_DURATION_MS)
          : null,
      },
    });
  }

  /**
   * Rotates a refresh token and issues a new access + refresh token pair.
   *
   * Looks up the SHA-256 hash of the raw token, verifies it has not been
   * revoked or expired, then atomically revokes the old token and issues
   * a new pair. This single-use rotation prevents refresh token reuse attacks.
   *
   * @param rawToken - The raw (unhashed) refresh token from the HTTP-only cookie
   * @param ip - Client IP address recorded in the audit log
   * @param ua - User-Agent header recorded in the audit log
   * @returns A new access token and refresh token pair
   * @throws UnauthorizedException if the token is invalid, revoked, or expired
   */
  async refresh(rawToken: string, ip: string, ua: string) {
    const tokenHash = this.sha256(rawToken);

    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.revokedAt !== null || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokenPair(
      record.userId,
      record.user.email,
      record.user.role,
      ip,
      ua,
    );
    await this.audit.log('auth.refresh', record.userId, ip, ua);

    return tokens;
  }

  /**
   * Terminates the current session by revoking the active refresh token.
   *
   * If no raw token is supplied (e.g. the cookie was already cleared), the
   * method still writes an audit log entry and returns successfully.
   *
   * @param userId - The authenticated user's ID
   * @param rawToken - The raw refresh token to revoke (optional)
   * @param ip - Client IP address for the audit log
   * @param ua - User-Agent header for the audit log
   */
  async logout(
    userId: string,
    rawToken: string | undefined,
    ip?: string,
    ua?: string,
  ) {
    if (rawToken) {
      const tokenHash = this.sha256(rawToken);
      await this.prisma.refreshToken.updateMany({
        where: { userId, tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit.log('auth.logout', userId, ip, ua);
  }

  /**
   * Revokes all active refresh tokens for the user ("logout everywhere").
   *
   * Useful when a user suspects their account has been compromised or
   * when an admin forces a full session reset.
   *
   * @param userId - The authenticated user's ID
   * @param ip - Client IP address for the audit log
   * @param ua - User-Agent header for the audit log
   */
  async logoutAll(userId: string, ip?: string, ua?: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log('auth.logout_all', userId, ip, ua);
  }

  /**
   * Returns the public profile of the currently authenticated user.
   *
   * @param userId - The authenticated user's ID
   * @returns The user object without sensitive fields (passwordHash, lockout state)
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.sanitizeUser(user);
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    role: string,
    ip: string,
    ua: string,
  ) {
    const accessToken = this.jwt.sign(
      { sub: userId, email, role, jti: randomUUID() },
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_TTL') ?? '15m',
      },
    );

    const refreshToken = this.jwt.sign(
      { sub: userId, jti: randomUUID() },
      {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_TTL') ?? '7d',
      },
    );

    const tokenHash = this.sha256(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt, ip, userAgent: ua },
    });

    return { accessToken, refreshToken };
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private sanitizeUser(user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    emailVerifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    passwordHash: string;
    failedLoginAttempts?: number;
    lastFailedLoginAt?: Date | null;
    lockedUntil?: Date | null;
  }) {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      passwordHash,
      failedLoginAttempts,
      lastFailedLoginAt,
      lockedUntil,
      ...rest
    } = user;
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return rest;
  }
}
