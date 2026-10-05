import { Test, TestingModule } from '@nestjs/testing';
import { WishListener } from './wish-listener';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('WishListener', () => {
  let listener: WishListener;
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
        WishListener,
        { provide: NotificationsService, useValue: notificationsService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    listener = module.get<WishListener>(WishListener);
  });

  it('should send telegram message when notifyOnWish is true and chatId exists', async () => {
    (prisma.notificationConfig!.findUnique as jest.Mock).mockResolvedValue({
      invitationId: 'inv-1',
      telegramChatId: '12345678',
      notifyOnWish: true,
    });

    const payload = {
      invitationId: 'inv-1',
      wish: {
        senderName: 'Bạn Thân',
        content: 'Trăm năm hạnh phúc nha!',
      },
    };

    await listener.handleWishCreated(payload);

    expect(prisma.notificationConfig!.findUnique).toHaveBeenCalledWith({
      where: { invitationId: 'inv-1' },
    });
    expect(notificationsService.sendTelegramMessage).toHaveBeenCalledWith(
      '12345678',
      `💌 <b>Lời chúc mới!</b>\nNgười gửi: <b>Bạn Thân</b>\nNội dung: Trăm năm hạnh phúc nha!`,
    );
  });

  it('should skip sending if notifyOnWish is false', async () => {
    (prisma.notificationConfig!.findUnique as jest.Mock).mockResolvedValue({
      invitationId: 'inv-1',
      telegramChatId: '12345678',
      notifyOnWish: false,
    });

    const payload = {
      invitationId: 'inv-1',
      wish: {
        senderName: 'Bạn Thân',
        content: 'Trăm năm hạnh phúc nha!',
      },
    };

    await listener.handleWishCreated(payload);

    expect(notificationsService.sendTelegramMessage).not.toHaveBeenCalled();
  });

  it('should skip sending if telegramChatId is missing', async () => {
    (prisma.notificationConfig!.findUnique as jest.Mock).mockResolvedValue({
      invitationId: 'inv-1',
      telegramChatId: null,
      notifyOnWish: true,
    });

    const payload = {
      invitationId: 'inv-1',
      wish: {
        senderName: 'Bạn Thân',
        content: 'Trăm năm hạnh phúc nha!',
      },
    };

    await listener.handleWishCreated(payload);

    expect(notificationsService.sendTelegramMessage).not.toHaveBeenCalled();
  });
});
