import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  invitationId: string;

  // Ignored: the price is decided by the server (PAYMENT_LIFETIME_PRICE).
  @IsInt()
  @IsPositive()
  @IsOptional()
  amount?: number;
}
