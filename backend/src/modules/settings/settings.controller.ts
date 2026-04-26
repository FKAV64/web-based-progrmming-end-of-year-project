import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { type Request, type Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(@Req() req: Request) {
    const userId = (req.user as { userId: string }).userId;
    return this.settingsService.findOne(userId);
  }

  @Patch()
  async updateSettings(@Req() req: Request, @Body() dto: UpdateSettingsDto) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip || req.socket?.remoteAddress;
    const ua = req.headers['user-agent'];
    return this.settingsService.update(userId, dto, ip, ua);
  }
}
