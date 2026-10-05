import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let notificationsService: Partial<Record<keyof NotificationsService, jest.Mock>>;

  beforeEach(async () => {
    notificationsService = {
      upsertConfig: jest.fn(),
      getConfig: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  describe('bindTelegram', () => {
    it('should call notificationsService.upsertConfig with invitationId and dto', async () => {
      const dto = {
        telegramChatId: '12345678',
        notifyOnRsvp: true,
      };
      const mockResult = { id: 'cfg-1', invitationId: 'inv-1', ...dto };
      notificationsService.upsertConfig!.mockResolvedValue(mockResult);

      const result = await controller.bindTelegram('inv-1', dto);

      expect(result).toBe(mockResult);
      expect(notificationsService.upsertConfig).toHaveBeenCalledWith('inv-1', dto);
    });
  });

  describe('getConfig', () => {
    it('should call notificationsService.getConfig with invitationId', async () => {
      const mockResult = { id: 'cfg-1', invitationId: 'inv-1', telegramChatId: '123' };
      notificationsService.getConfig!.mockResolvedValue(mockResult);

      const result = await controller.getConfig('inv-1');

      expect(result).toBe(mockResult);
      expect(notificationsService.getConfig).toHaveBeenCalledWith('inv-1');
    });
  });
});
