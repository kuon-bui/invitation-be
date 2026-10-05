import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class BindTelegramDto {
  @IsOptional()
  @IsString()
  telegramChatId?: string;

  @IsOptional()
  @IsEmail()
  emailNotify?: string;

  @IsOptional()
  @IsBoolean()
  notifyOnRsvp?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnWish?: boolean;
}
