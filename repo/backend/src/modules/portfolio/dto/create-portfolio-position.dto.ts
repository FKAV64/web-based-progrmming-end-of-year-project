import { IsEnum, IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';
import { Currency } from '@prisma/client';

export class CreatePortfolioPositionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  coinId: string;

  @IsNumberString()
  quantity: string; // Prisma Decimal accepts string to preserve precision

  @IsNumberString()
  avgBuyPrice: string;

  @IsEnum(Currency)
  buyCurrency: Currency;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
