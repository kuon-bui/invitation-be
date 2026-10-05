import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class RsvpListener {
  private readonly logger = new Logger(RsvpListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @OnEvent('rsvp.created')
  async handleRsvpCreated(payload: {
    invitationId: string;
    rsvp: {
      guestName: string;
      attending: boolean;
      guestCount?: number;
      diet?: string | null;
      note?: string | null;
    };
  }) {
    try {
      const config = await this.prisma.notificationConfig.findUnique({
        where: { invitationId: payload.invitationId },
      });

      if (!config || !config.telegramChatId || config.notifyOnRsvp === false) {
        return;
      }

      const { rsvp } = payload;
      const statusText = rsvp.attending ? '✅ Sẽ tham dự' : '❌ Rất tiếc không thể';
      const dietText = rsvp.diet || 'Mặc định';
      const noteText = rsvp.note || 'Không có';

      const message = `🎉 <b>Xác nhận tham dự mới!</b>\nKhách: <b>${rsvp.guestName}</b>\nTrạng thái: ${statusText}\nSố người: ${rsvp.guestCount ?? 1}\nKhẩu vị: ${dietText}\nLời nhắn: ${noteText}`;

      await this.notificationsService.sendTelegramMessage(
        config.telegramChatId,
        message,
      );
    } catch (error) {
      this.logger.error(`Error in handleRsvpCreated: ${error?.message || error}`);
    }
  }
}
