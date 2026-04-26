import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { type Request, type Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const REFRESH_COOKIE = 'refresh_token';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip ?? '';
    const ua = (req.headers['user-agent'] as string) ?? '';
    const { user, accessToken, refreshToken } = await this.authService.register(
      dto,
      ip,
      ua,
    );
    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip ?? '';
    const ua = (req.headers['user-agent'] as string) ?? '';
    const { user, accessToken, refreshToken } = await this.authService.login(
      dto,
      ip,
      ua,
    );
    this.setRefreshCookie(res, refreshToken);
    return { user, accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException('No refresh token');
    const ip = req.ip ?? '';
    const ua = (req.headers['user-agent'] as string) ?? '';
    const { accessToken, refreshToken } = await this.authService.refresh(
      token,
      ip,
      ua,
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.authService.getMe(userId);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token: string | undefined = req.cookies?.[REFRESH_COOKIE];
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip ?? '';
    const ua = (req.headers['user-agent'] as string) ?? '';
    await this.authService.logout(userId, token, ip, ua);
    res.clearCookie(REFRESH_COOKIE);
    return { message: 'Logged out' };
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout-all')
  async logoutAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip ?? '';
    const ua = (req.headers['user-agent'] as string) ?? '';
    await this.authService.logoutAll(userId, ip, ua);
    res.clearCookie(REFRESH_COOKIE);
    return { message: 'All sessions revoked' };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SEVEN_DAYS_MS,
    });
  }
}
