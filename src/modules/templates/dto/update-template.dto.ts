import { IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString } from 'class-validator';
import { EventType } from '@prisma/client';

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(EventType)
  @IsOptional()
  eventType?: EventType;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  badge?: string;

  @IsString()
  @IsOptional()
  styleDesc?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  order?: number;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}
