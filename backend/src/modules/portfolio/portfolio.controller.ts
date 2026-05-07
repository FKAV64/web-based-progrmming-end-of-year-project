import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioPositionDto } from './dto/create-portfolio-position.dto';
import { UpdatePortfolioPositionDto } from './dto/update-portfolio-position.dto';
import { ClosePortfolioPositionDto } from './dto/close-portfolio-position.dto';

@ApiTags('Portfolio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  @ApiOperation({ summary: 'List portfolio positions' })
  @ApiQuery({ name: 'includeClosed', required: false, description: 'Include closed positions' })
  @ApiResponse({ status: 200, description: 'Array of positions' })
  async findAll(@Req() req: Request, @Query('includeClosed') includeClosed?: string) {
    const userId = (req.user as { userId: string }).userId;
    const isIncludeClosed = includeClosed === 'true';
    return this.portfolioService.findAll(userId, isIncludeClosed);
  }

  @Post()
  @ApiOperation({ summary: 'Open a new portfolio position' })
  @ApiResponse({ status: 201, description: 'Position created' })
  async create(@Req() req: Request, @Body() dto: CreatePortfolioPositionDto) {
    const userId = (req.user as { userId: string }).userId;
    return this.portfolioService.create(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a portfolio position' })
  @ApiParam({ name: 'id', description: 'Position UUID' })
  @ApiResponse({ status: 200, description: 'Updated position' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdatePortfolioPositionDto,
  ) {
    const userId = (req.user as { userId: string }).userId;
    return this.portfolioService.update(userId, id, dto);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close a portfolio position' })
  @ApiParam({ name: 'id', description: 'Position UUID' })
  @ApiResponse({ status: 200, description: 'Closed position record' })
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
  @ApiOperation({ summary: 'Delete a portfolio position' })
  @ApiParam({ name: 'id', description: 'Position UUID' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    const userId = (req.user as { userId: string }).userId;
    await this.portfolioService.remove(userId, id);
  }
}
