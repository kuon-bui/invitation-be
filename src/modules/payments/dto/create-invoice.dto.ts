import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  invitationId: string;

  @IsInt()
  @IsPositive()
  amount: number;
}
