import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BindTelegramDto } from './dto/bind-telegram.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsertConfig(invitationId: string, dto: BindTelegramDto) {
    return this.prisma.notificationConfig.upsert({
      where: { invitationId },
      update: {
        telegramChatId: dto.telegramChatId,
        emailNotify: dto.emailNotify,
        notifyOnRsvp: dto.notifyOnRsvp,
        notifyOnWish: dto.notifyOnWish,
      },
      create: {
        invitationId,
        telegramChatId: dto.telegramChatId,
        emailNotify: dto.emailNotify,
        notifyOnRsvp: dto.notifyOnRsvp,
        notifyOnWish: dto.notifyOnWish,
      },
    });
  }

  async getConfig(invitationId: string) {
    return this.prisma.notificationConfig.findUnique({
      where: { invitationId },
    });
  }

  async sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN is not set, skipping telegram notification');
      return false;
    }

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Telegram API responded with error: ${errorText}`);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to send Telegram message: ${error?.message || error}`);
      return false;
    }
  }
}
