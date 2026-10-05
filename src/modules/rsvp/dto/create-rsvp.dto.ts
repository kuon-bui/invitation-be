import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateRsvpDto {
  @IsString()
  @IsOptional()
  guestId?: string;

  @IsString()
  @IsNotEmpty()
  guestName: string;

  @IsBoolean()
  attending: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  guestCount?: number;

  @IsString()
  @IsOptional()
  diet?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
