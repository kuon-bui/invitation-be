import { IsArray, IsDate, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { EventType } from '@prisma/client';

export class CreateInvitationDto {
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @IsEnum(EventType)
  @IsOptional()
  eventType?: EventType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  eventDate: Date;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsNotEmpty()
  venueName: string;

  @IsString()
  @IsNotEmpty()
  venueAddress: string;

  @IsString()
  @IsOptional()
  mapUrl?: string;

  @IsString()
  @IsOptional()
  musicUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  gallery?: string[];

  @IsObject()
  @IsOptional()
  details?: Record<string, any>;

  @IsObject()
  @IsOptional()
  customConfig?: Record<string, any>;
}
