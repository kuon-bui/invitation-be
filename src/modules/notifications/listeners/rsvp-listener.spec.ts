import { Test, TestingModule } from '@nestjs/testing';
import { RsvpListener } from './rsvp-listener';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('RsvpListener', () => {
  let listener: RsvpListener;
  let notificationsService: Partial<NotificationsService>;
  let prisma: Partial<PrismaService>;

  beforeEach(async () => {
    notificationsService = {
      sendTelegramMessage: jest.fn().mockResolvedValue(true),
    };
    prisma = {
      notificationConfig: {
        findUnique: jest.fn(),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RsvpListener,
        { provide: NotificationsService, useValue: notificationsService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    listener = module.get<RsvpListener>(RsvpListener);
  });

  it('should send telegram message when notifyOnRsvp is true and chatId exists', async () => {
    (prisma.notificationConfig!.findUnique as jest.Mock).mockResolvedValue({
      invitationId: 'inv-1',
      telegramChatId: '12345678',
      notifyOnRsvp: true,
    });

    const payload = {
      invitationId: 'inv-1',
      rsvp: {
        guestName: 'Nguyễn Văn A',
        attending: true,
        guestCount: 2,
        diet: 'chay',
        note: 'Chúc mừng hai bạn',
      },
    };

    await listener.handleRsvpCreated(payload);

    expect(prisma.notificationConfig!.findUnique).toHaveBeenCalledWith({
      where: { invitationId: 'inv-1' },
    });
    expect(notificationsService.sendTelegramMessage).toHaveBeenCalledWith(
      '12345678',
      `🎉 <b>Xác nhận tham dự mới!</b>\nKhách: <b>Nguyễn Văn A</b>\nTrạng thái: ✅ Sẽ tham dự\nSố người: 2\nKhẩu vị: chay\nLời nhắn: Chúc mừng hai bạn`,
    );
  });

  it('should format message with fallback diet and note and declined status', async () => {
    (prisma.notificationConfig!.findUnique as jest.Mock).mockResolvedValue({
      invitationId: 'inv-1',
      telegramChatId: '12345678',
      notifyOnRsvp: true,
    });

    const payload = {
      invitationId: 'inv-1',
      rsvp: {
        guestName: 'Trần Thị B',
        attending: false,
        guestCount: 1,
        diet: null,
        note: null,
      },
    };

    await listener.handleRsvpCreated(payload);

    expect(notificationsService.sendTelegramMessage).toHaveBeenCalledWith(
      '12345678',
      `🎉 <b>Xác nhận tham dự mới!</b>\nKhách: <b>Trần Thị B</b>\nTrạng thái: ❌ Rất tiếc không thể\nSố người: 1\nKhẩu vị: Mặc định\nLời nhắn: Không có`,
    );
  });

  it('should skip sending if notifyOnRsvp is false', async () => {
    (prisma.notificationConfig!.findUnique as jest.Mock).mockResolvedValue({
      invitationId: 'inv-1',
      telegramChatId: '12345678',
      notifyOnRsvp: false,
    });

    const payload = {
      invitationId: 'inv-1',
      rsvp: {
        guestName: 'Nguyễn Văn A',
        attending: true,
        guestCount: 1,
      },
    };

    await listener.handleRsvpCreated(payload as any);

    expect(notificationsService.sendTelegramMessage).not.toHaveBeenCalled();
  });

  it('should skip sending if telegramChatId is missing', async () => {
    (prisma.notificationConfig!.findUnique as jest.Mock).mockResolvedValue({
      invitationId: 'inv-1',
      telegramChatId: null,
      notifyOnRsvp: true,
    });

    const payload = {
      invitationId: 'inv-1',
      rsvp: {
        guestName: 'Nguyễn Văn A',
        attending: true,
        guestCount: 1,
      },
    };

    await listener.handleRsvpCreated(payload as any);

    expect(notificationsService.sendTelegramMessage).not.toHaveBeenCalled();
  });

  it('should skip sending if notification config does not exist', async () => {
    (prisma.notificationConfig!.findUnique as jest.Mock).mockResolvedValue(null);

    const payload = {
      invitationId: 'inv-1',
      rsvp: {
        guestName: 'Nguyễn Văn A',
        attending: true,
        guestCount: 1,
      },
    };

    await listener.handleRsvpCreated(payload as any);

    expect(notificationsService.sendTelegramMessage).not.toHaveBeenCalled();
  });
});
