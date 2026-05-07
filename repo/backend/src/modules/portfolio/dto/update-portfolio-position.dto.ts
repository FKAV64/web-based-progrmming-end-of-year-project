import { IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePortfolioPositionDto {
  @IsOptional()
  @IsNumberString()
  quantity?: string;

  @IsOptional()
  @IsNumberString()
  avgBuyPrice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
