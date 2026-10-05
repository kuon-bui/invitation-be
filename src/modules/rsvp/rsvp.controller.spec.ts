import { Test, TestingModule } from '@nestjs/testing';
import { RsvpController } from './rsvp.controller';
import { MyRsvpController } from './my-rsvp.controller';
import { RsvpService } from './rsvp.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('RsvpController and MyRsvpController', () => {
  let rsvpController: RsvpController;
  let myRsvpController: MyRsvpController;
  let rsvpService: Partial<Record<keyof RsvpService, jest.Mock>>;

  beforeEach(async () => {
    rsvpService = {
      create: jest.fn(),
      findAllByInvitation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RsvpController, MyRsvpController],
      providers: [
        {
          provide: RsvpService,
          useValue: rsvpService,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    rsvpController = module.get<RsvpController>(RsvpController);
    myRsvpController = module.get<MyRsvpController>(MyRsvpController);
  });

  describe('RsvpController', () => {
    it('create should call service.create with invitation id and dto', async () => {
      const dto = {
        guestName: 'Nguyen Van B',
        attending: true,
        guestCount: 2,
      };
      const mockResult = { id: 'rsvp-1', ...dto };
      rsvpService.create!.mockResolvedValue(mockResult);

      const result = await rsvpController.create('inv-1', dto);

      expect(result).toBe(mockResult);
      expect(rsvpService.create).toHaveBeenCalledWith('inv-1', dto);
    });
  });

  describe('MyRsvpController', () => {
    it('getRsvps should return list and stats from service', async () => {
      const mockResult = {
        stats: { total: 1, attending: 1, declined: 0, totalGuests: 1, dietStats: { chay: 0, man: 1, other: 0 } },
        rsvps: [{ id: 'rsvp-1' }],
      };
      rsvpService.findAllByInvitation!.mockResolvedValue(mockResult);

      const result = await myRsvpController.getRsvps('inv-1');

      expect(result).toBe(mockResult);
      expect(rsvpService.findAllByInvitation).toHaveBeenCalledWith('inv-1');
    });
  });
});
