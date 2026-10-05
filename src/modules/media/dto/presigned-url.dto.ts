import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PresignedUrlDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  fileType: string;

  @IsString()
  @IsOptional()
  folder?: string;
}
