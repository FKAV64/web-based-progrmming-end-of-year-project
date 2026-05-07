import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateWatchlistItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  coinId: string;
}
