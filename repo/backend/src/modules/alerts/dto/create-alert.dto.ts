import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsString,
  MaxLength,
} from 'class-validator';
import { AlertCondition, Currency } from '@prisma/client';

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  coinId: string;

  @IsEnum(AlertCondition)
  condition: AlertCondition;

  @IsNumberString()
  targetPrice: string;

  @IsEnum(Currency)
  currency: Currency;
}
