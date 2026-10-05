import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { GuestSide } from '@prisma/client';

export class CreateGuestDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(GuestSide)
  @IsOptional()
  side?: GuestSide;

  @IsString()
  @IsOptional()
  phone?: string;
}
