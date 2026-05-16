import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, logoutAllAt: true },
    });
    if (!user) throw new UnauthorizedException();
    // Reject tokens issued before the last logout-all (covers the full 15-min access token window)
    if (user.logoutAllAt && payload.iat && payload.iat * 1000 < user.logoutAllAt.getTime()) {
      throw new UnauthorizedException('Session revoked');
    }
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
