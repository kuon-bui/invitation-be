import { IsNotEmpty, IsString } from 'class-validator';

export class CreateWishDto {
  @IsString()
  @IsNotEmpty()
  senderName: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
