import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { type Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlertsService } from './alerts.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'List price alerts' })
  @ApiQuery({
    name: 'includeTriggered',
    required: false,
    description: 'Include already-triggered alerts',
  })
  @ApiResponse({ status: 200, description: 'Array of alerts' })
  async findAll(
    @Req() req: Request,
    @Query('includeTriggered') includeTriggered?: string,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const isIncludeTriggered = includeTriggered === 'true';
    return this.alertsService.findAll(userId, isIncludeTriggered);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new price alert' })
  @ApiResponse({ status: 201, description: 'Alert created' })
  async create(@Req() req: Request, @Body() dto: CreateAlertDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.alertsService.create(userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a price alert' })
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { userId: string }).userId;
    await this.alertsService.remove(userId, id);
  }
}
