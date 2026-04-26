import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @Transform(({ value }: { value: string }) => value?.toLowerCase?.())
  @IsEmail()
  email: string;

  @MinLength(8)
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)/, {
    message: 'password must contain at least one letter and one digit',
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
