import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreatePublicInvoiceDto {
  @IsString()
  @IsOptional()
  invitationId?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  // Ignored: the price is decided by the server (PAYMENT_LIFETIME_PRICE).
  @IsInt()
  @IsPositive()
  @IsOptional()
  amount?: number;
}
