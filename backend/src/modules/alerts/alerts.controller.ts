import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { type Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async findAll(@Req() req: Request, @Query('includeTriggered') includeTriggered?: string) {
    const userId = (req.user as { userId: string }).userId;
    const isIncludeTriggered = includeTriggered === 'true';
    return this.alertsService.findAll(userId, isIncludeTriggered);
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateAlertDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.alertsService.create(userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { userId: string }).userId;
    await this.alertsService.remove(userId, id);
  }
}
