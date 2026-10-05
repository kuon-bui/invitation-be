import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { GuestSide } from '@prisma/client';

export class QueryGuestDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(GuestSide)
  @IsOptional()
  side?: GuestSide;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  hasViewed?: boolean;
}
