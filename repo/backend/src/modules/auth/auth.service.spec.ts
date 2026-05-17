import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

// Mock the entire argon2 module so native properties can be overridden.
// The real implementation is accessed via jest.requireActual when needed.
jest.mock('argon2');

const realArgon2 = jest.requireActual<typeof import('argon2')>('argon2');

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hashed',
  name: null,
  role: 'USER',
  emailVerifiedAt: null,
  failedLoginAttempts: 0,
  lastFailedLoginAt: null,
  lockedUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeRefreshRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'rt-1',
  userId: 'user-1',
  tokenHash: 'some-hash',
  expiresAt: new Date(Date.now() + 100_000),
  revokedAt: null,
  user: { email: 'test@example.com', role: 'USER' },
  ...overrides,
});

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: Record<string, Record<string, jest.Mock> | jest.Mock>;
  let jwtMock: { sign: jest.Mock };
  let auditMock: { log: jest.Mock };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      userSettings: { create: jest.fn() },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };

    jwtMock = { sign: jest.fn().mockReturnValue('mock-token') };
    auditMock = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtMock },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
        { provide: AuditService, useValue: auditMock },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ── 1. argon2 happy path ──────────────────────────────────────────────────
  describe('argon2', () => {
    it('hashes a password and verifies it correctly (real argon2)', async () => {
      const password = 'TestPass1';
      const hash = await realArgon2.hash(password, {
        type: realArgon2.argon2id,
      });

      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      await expect(realArgon2.verify(hash, password)).resolves.toBe(true);
      await expect(realArgon2.verify(hash, 'WrongPass1')).resolves.toBe(false);
    });
  });

  // ── 2. register ───────────────────────────────────────────────────────────
  describe('register', () => {
    it('throws ConflictException on duplicate email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(makeUser());

      await expect(
        service.register(
          { email: 'test@example.com', password: 'Test1234', name: 'Test User' },
          '',
          '',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('writes auth.register to audit log on success', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      jest.mocked(argon2.hash).mockResolvedValueOnce('hashed');
      prismaMock.user.create.mockResolvedValue(makeUser());
      prismaMock.userSettings.create.mockResolvedValue({});
      prismaMock.refreshToken.create.mockResolvedValue({});

      await service.register(
        { email: 'test@example.com', password: 'Test1234', name: 'Test User' },
        '1.2.3.4',
        'test-agent',
      );

      expect(auditMock.log).toHaveBeenCalledWith(
        'auth.register',
        'user-1',
        '1.2.3.4',
        'test-agent',
      );
    });
  });

  // ── 3. login ──────────────────────────────────────────────────────────────
  describe('login', () => {
    it('throws UnauthorizedException and logs auth.login_failed on wrong password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(makeUser());
      jest.mocked(argon2.verify).mockResolvedValueOnce(false);

      await expect(
        service.login(
          { email: 'test@example.com', password: 'Wrong1' },
          '1.2.3.4',
          'ua',
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(auditMock.log).toHaveBeenCalledWith(
        'auth.login_failed',
        'user-1',
        '1.2.3.4',
        'ua',
      );
    });

    it('logs auth.login_success on valid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(makeUser());
      jest.mocked(argon2.verify).mockResolvedValueOnce(true);
      prismaMock.refreshToken.create.mockResolvedValue({});

      await service.login(
        { email: 'test@example.com', password: 'Test1234' },
        '1.2.3.4',
        'ua',
      );

      expect(auditMock.log).toHaveBeenCalledWith(
        'auth.login_success',
        'user-1',
        '1.2.3.4',
        'ua',
      );
    });
  });

  // ── 4 & 5. refresh ────────────────────────────────────────────────────────
  describe('refresh', () => {
    it('throws UnauthorizedException for revoked token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(
        makeRefreshRecord({ revokedAt: new Date() }),
      );

      await expect(service.refresh('any-token', '', '')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for expired token', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(
        makeRefreshRecord({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.refresh('any-token', '', '')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rotates the token pair on a valid refresh', async () => {
      prismaMock.refreshToken.findUnique.mockResolvedValue(makeRefreshRecord());
      prismaMock.refreshToken.update.mockResolvedValue({});
      prismaMock.refreshToken.create.mockResolvedValue({});
      jwtMock.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const tokens = await service.refresh('old-token', '1.2.3.4', 'ua');

      expect(prismaMock.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' } }),
      );
      expect(prismaMock.refreshToken.create).toHaveBeenCalled();
      expect(tokens.accessToken).toBe('new-access-token');
      expect(tokens.refreshToken).toBe('new-refresh-token');
      expect(auditMock.log).toHaveBeenCalledWith(
        'auth.refresh',
        'user-1',
        '1.2.3.4',
        'ua',
      );
    });
  });

  // ── lockout ───────────────────────────────────────────────────────────────
  describe('account lockout', () => {
    it('rejects login with 429 when lockedUntil is in the future', async () => {
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser({ lockedUntil: new Date(Date.now() + 60_000) }),
      );

      await expect(
        service.login(
          { email: 'test@example.com', password: 'Test1234' },
          '1.2.3.4',
          'ua',
        ),
      ).rejects.toMatchObject({ status: 429 });

      expect(auditMock.log).toHaveBeenCalledWith(
        'auth.login_locked',
        'user-1',
        '1.2.3.4',
        'ua',
      );
    });

    it('sets lockedUntil and resets counter when 10th failed attempt arrives within window', async () => {
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser({
          failedLoginAttempts: 9,
          lastFailedLoginAt: new Date(Date.now() - 60_000),
        }),
      );
      jest.mocked(argon2.verify).mockResolvedValueOnce(false);

      await expect(
        service.login(
          { email: 'test@example.com', password: 'Wrong1' },
          '',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);

      const updateCall = prismaMock.user.update.mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: 'user-1' });
      expect(updateCall.data.failedLoginAttempts).toBe(0);
      expect(updateCall.data.lockedUntil).toBeInstanceOf(Date);
    });

    it('resets counter to 1 when last failure was outside the 15min window', async () => {
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser({
          failedLoginAttempts: 9,
          lastFailedLoginAt: new Date(Date.now() - 16 * 60 * 1000),
        }),
      );
      jest.mocked(argon2.verify).mockResolvedValueOnce(false);

      await expect(
        service.login(
          { email: 'test@example.com', password: 'Wrong1' },
          '',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);

      const updateCall = prismaMock.user.update.mock.calls[0][0];
      expect(updateCall.data.failedLoginAttempts).toBe(1);
      expect(updateCall.data.lockedUntil).toBeNull();
    });

    it('clears lockout state on successful login', async () => {
      prismaMock.user.findUnique.mockResolvedValue(
        makeUser({ failedLoginAttempts: 4, lastFailedLoginAt: new Date() }),
      );
      jest.mocked(argon2.verify).mockResolvedValueOnce(true);
      prismaMock.refreshToken.create.mockResolvedValue({});

      await service.login(
        { email: 'test@example.com', password: 'Test1234' },
        '',
        '',
      );

      const updateCall = prismaMock.user.update.mock.calls[0][0];
      expect(updateCall.data).toEqual({
        failedLoginAttempts: 0,
        lastFailedLoginAt: null,
        lockedUntil: null,
      });
    });
  });

  // ── 6. audit log coverage ─────────────────────────────────────────────────
  describe('audit log', () => {
    it('logs auth.login_failed when user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'ghost@example.com', password: 'Test1234' },
          '9.9.9.9',
          'ua',
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(auditMock.log).toHaveBeenCalledWith(
        'auth.login_failed',
        undefined,
        '9.9.9.9',
        'ua',
        { email: 'ghost@example.com' },
      );
    });
  });
});
