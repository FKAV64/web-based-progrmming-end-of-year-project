import { IsNumberString } from 'class-validator';

export class ClosePortfolioPositionDto {
  @IsNumberString()
  closePrice: string;
}
