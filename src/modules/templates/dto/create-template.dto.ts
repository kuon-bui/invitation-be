import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { EventType } from '@prisma/client';

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(EventType)
  @IsOptional()
  eventType?: EventType;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  badge?: string;

  @IsString()
  @IsNotEmpty()
  styleDesc: string;

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
  @IsNotEmpty()
  config: Record<string, any>;
}
