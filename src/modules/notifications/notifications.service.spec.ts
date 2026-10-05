import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: Partial<PrismaService>;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    prisma = {
      notificationConfig: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('upsertConfig', () => {
    it('should upsert notification config for an invitation', async () => {
      (prisma.notificationConfig!.upsert as jest.Mock).mockResolvedValue({
        id: 'cfg-1',
        invitationId: 'inv-1',
        telegramChatId: '12345678',
        emailNotify: 'couple@example.com',
        notifyOnRsvp: true,
        notifyOnWish: true,
      });

      const result = await service.upsertConfig('inv-1', {
        telegramChatId: '12345678',
        emailNotify: 'couple@example.com',
        notifyOnRsvp: true,
        notifyOnWish: true,
      });

      expect(result.telegramChatId).toBe('12345678');
      expect(prisma.notificationConfig!.upsert).toHaveBeenCalledWith({
        where: { invitationId: 'inv-1' },
        update: {
          telegramChatId: '12345678',
          emailNotify: 'couple@example.com',
          notifyOnRsvp: true,
          notifyOnWish: true,
        },
        create: {
          invitationId: 'inv-1',
          telegramChatId: '12345678',
          emailNotify: 'couple@example.com',
          notifyOnRsvp: true,
          notifyOnWish: true,
        },
      });
    });
  });

  describe('getConfig', () => {
    it('should return notification config for an invitation', async () => {
      (prisma.notificationConfig!.findUnique as jest.Mock).mockResolvedValue({
        id: 'cfg-1',
        invitationId: 'inv-1',
        telegramChatId: '12345678',
      });

      const result = await service.getConfig('inv-1');
      expect(result?.telegramChatId).toBe('12345678');
      expect(prisma.notificationConfig!.findUnique).toHaveBeenCalledWith({
        where: { invitationId: 'inv-1' },
      });
    });
  });

  describe('sendTelegramMessage', () => {
    it('should skip sending if TELEGRAM_BOT_TOKEN is not set', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      const fetchSpy = jest.spyOn(global, 'fetch');

      const result = await service.sendTelegramMessage('12345678', 'Test message');

      expect(result).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should send HTTP POST request to Telegram API when token and chatId are provided', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'test-token-123';
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: {} }),
      });
      global.fetch = mockFetch as any;

      const result = await service.sendTelegramMessage('12345678', '<b>Hello</b>');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bottest-token-123/sendMessage',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: '12345678',
            text: '<b>Hello</b>',
            parse_mode: 'HTML',
          }),
        },
      );
    });

    it('should catch error and return false if fetch fails', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'test-token-123';
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as any;

      const result = await service.sendTelegramMessage('12345678', 'Fail test');

      expect(result).toBe(false);
    });
  });
});
