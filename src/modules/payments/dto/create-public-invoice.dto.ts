import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePublicInvoiceDto {
  @IsString()
  @IsOptional()
  invitationId?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  amount?: number;
}
