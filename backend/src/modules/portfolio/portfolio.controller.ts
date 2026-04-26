import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { type Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioPositionDto } from './dto/create-portfolio-position.dto';
import { UpdatePortfolioPositionDto } from './dto/update-portfolio-position.dto';
import { ClosePortfolioPositionDto } from './dto/close-portfolio-position.dto';

@UseGuards(JwtAuthGuard)
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  async findAll(@Req() req: Request, @Query('includeClosed') includeClosed?: string) {
    const userId = (req.user as { userId: string }).userId;
    const isIncludeClosed = includeClosed === 'true';
    return this.portfolioService.findAll(userId, isIncludeClosed);
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreatePortfolioPositionDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.portfolioService.create(userId, dto);
  }

  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioPositionDto,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.portfolioService.update(userId, id, dto);
  }

  @Post(':id/close')
  async close(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: ClosePortfolioPositionDto,
  ) {
    const userId = (req.user as { userId: string }).userId;
    const ip = req.ip || req.socket?.remoteAddress;
    const ua = req.headers['user-agent'];
    return this.portfolioService.close(userId, id, dto, ip, ua);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { userId: string }).userId;
    await this.portfolioService.remove(userId, id);
  }
}
