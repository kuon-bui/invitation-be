import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class WishListener {
  private readonly logger = new Logger(WishListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @OnEvent('wish.created')
  async handleWishCreated(payload: {
    invitationId: string;
    wish: {
      senderName: string;
      content: string;
    };
  }) {
    try {
      const config = await this.prisma.notificationConfig.findUnique({
        where: { invitationId: payload.invitationId },
      });

      if (!config || !config.telegramChatId || config.notifyOnWish !== true) {
        return;
      }

      const { wish } = payload;
      const message = `💌 <b>Lời chúc mới!</b>\nNgười gửi: <b>${wish.senderName}</b>\nNội dung: ${wish.content}`;

      await this.notificationsService.sendTelegramMessage(
        config.telegramChatId,
        message,
      );
    } catch (error) {
      this.logger.error(`Error in handleWishCreated: ${error?.message || error}`);
    }
  }
}
