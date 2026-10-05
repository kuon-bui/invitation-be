import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RsvpService } from './rsvp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('RsvpService', () => {
  let service: RsvpService;
  let prisma: {
    invitation: { findUnique: jest.Mock };
    rsvp: { create: jest.Mock; findMany: jest.Mock };
  };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      invitation: { findUnique: jest.fn() },
      rsvp: { create: jest.fn(), findMany: jest.fn() },
    };
    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RsvpService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<RsvpService>(RsvpService);
  });

  describe('create', () => {
    it('should create RSVP and emit rsvp.created event', async () => {
      prisma.invitation.findUnique.mockResolvedValue({ id: 'inv-1' });
      prisma.rsvp.create.mockResolvedValue({
        id: 'rsvp-1',
        invitationId: 'inv-1',
        guestName: 'Nguyen Van B',
        attending: true,
        guestCount: 2,
        diet: 'chay',
        note: 'Chuc mung',
      });

      const result = await service.create('inv-1', {
        guestName: 'Nguyen Van B',
        attending: true,
        guestCount: 2,
        diet: 'chay',
        note: 'Chuc mung',
      });

      expect(result.id).toBe('rsvp-1');
      expect(prisma.rsvp.create).toHaveBeenCalledWith({
        data: {
          invitationId: 'inv-1',
          guestId: undefined,
          guestName: 'Nguyen Van B',
          attending: true,
          guestCount: 2,
          diet: 'chay',
          note: 'Chuc mung',
        },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('rsvp.created', {
        invitationId: 'inv-1',
        rsvp: expect.objectContaining({ id: 'rsvp-1' }),
      });
    });

    it('should throw NotFoundException if invitation does not exist', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.create('non-existent-inv', {
          guestName: 'Nguyen Van B',
          attending: true,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByInvitation', () => {
    it('should return RSVP list and calculated statistics', async () => {
      prisma.invitation.findUnique.mockResolvedValue({ id: 'inv-1' });
      const mockRsvps = [
        {
          id: 'rsvp-1',
          invitationId: 'inv-1',
          guestName: 'Guest 1',
          attending: true,
          guestCount: 2,
          diet: 'chay',
        },
        {
          id: 'rsvp-2',
          invitationId: 'inv-1',
          guestName: 'Guest 2',
          attending: true,
          guestCount: 1,
          diet: 'man',
        },
        {
          id: 'rsvp-3',
          invitationId: 'inv-1',
          guestName: 'Guest 3',
          attending: false,
          guestCount: 1,
          diet: null,
        },
      ];
      prisma.rsvp.findMany.mockResolvedValue(mockRsvps);

      const result = await service.findAllByInvitation('inv-1');

      expect(result.rsvps).toEqual(mockRsvps);
      expect(result.stats).toEqual({
        total: 3,
        attending: 2,
        declined: 1,
        totalGuests: 3,
        dietStats: {
          chay: 1,
          man: 1,
          other: 0,
        },
      });
    });

    it('should throw NotFoundException if invitation does not exist', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(service.findAllByInvitation('non-existent-inv')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
