import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

const REFRESH_COOKIE = 'refresh_token';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getMe(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.usersService.findMe(userId);
  }

  @Get('me/export')
  @ApiOperation({ summary: 'Export all personal data as JSON' })
  @ApiResponse({ status: 200, description: 'JSON export of user data' })
  async exportMe(@Req() req: Request, @Res() res: Response) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip ?? '';
    const ua = (req.headers['user-agent'] as string) ?? '';
    const data = await this.usersService.exportData(userId, ip, ua);

    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="my-data-${date}.json"`,
    );
    res.send(JSON.stringify(data, null, 2));
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own account and all data (GDPR)' })
  @ApiResponse({ status: 204, description: 'Account deleted' })
  async deleteMe(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip ?? '';
    const ua = (req.headers['user-agent'] as string) ?? '';
    await this.usersService.deleteMe(userId, ip, ua);
    res.clearCookie(REFRESH_COOKIE);
  }
}
