import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WishesService } from './wishes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('WishesService', () => {
  let service: WishesService;
  let prisma: {
    invitation: { findUnique: jest.Mock };
    wish: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      invitation: { findUnique: jest.fn() },
      wish: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    eventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<WishesService>(WishesService);
  });

  describe('create', () => {
    it('should create wish with isApproved=true and emit wish.created event', async () => {
      prisma.invitation.findUnique.mockResolvedValue({ id: 'inv-1' });
      prisma.wish.create.mockResolvedValue({
        id: 'wish-1',
        invitationId: 'inv-1',
        senderName: 'Tran Van C',
        content: 'Chuc mung hanh phuc',
        isApproved: true,
        createdAt: new Date(),
      });

      const result = await service.create('inv-1', {
        senderName: 'Tran Van C',
        content: 'Chuc mung hanh phuc',
      });

      expect(result.id).toBe('wish-1');
      expect(prisma.wish.create).toHaveBeenCalledWith({
        data: {
          invitationId: 'inv-1',
          senderName: 'Tran Van C',
          content: 'Chuc mung hanh phuc',
          isApproved: true,
        },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('wish.created', {
        invitationId: 'inv-1',
        wish: expect.objectContaining({ id: 'wish-1' }),
      });
    });

    it('should throw NotFoundException if invitation does not exist', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.create('non-existent-inv', {
          senderName: 'Tran Van C',
          content: 'Chuc mung',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findApprovedByInvitation', () => {
    it('should return approved wishes with pagination', async () => {
      prisma.invitation.findUnique.mockResolvedValue({ id: 'inv-1' });
      const mockWishes = [
        { id: 'wish-1', senderName: 'A', content: 'Chuc mung', isApproved: true },
      ];
      prisma.wish.findMany.mockResolvedValue(mockWishes);
      prisma.wish.count.mockResolvedValue(1);

      const result = await service.findApprovedByInvitation('inv-1', { page: 1, limit: 20 });

      expect(result.data).toEqual(mockWishes);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
      expect(prisma.wish.findMany).toHaveBeenCalledWith({
        where: { invitationId: 'inv-1', isApproved: true },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException if invitation does not exist', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(
        service.findApprovedByInvitation('non-existent-inv', { page: 1, limit: 20 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleApproval', () => {
    it('should toggle isApproved from true to false', async () => {
      prisma.wish.findFirst.mockResolvedValue({
        id: 'wish-1',
        invitationId: 'inv-1',
        isApproved: true,
      });
      prisma.wish.update.mockResolvedValue({
        id: 'wish-1',
        invitationId: 'inv-1',
        isApproved: false,
      });

      const result = await service.toggleApproval('inv-1', 'wish-1');

      expect(prisma.wish.update).toHaveBeenCalledWith({
        where: { id: 'wish-1' },
        data: { isApproved: false },
      });
      expect(result.isApproved).toBe(false);
    });

    it('should toggle isApproved from false to true', async () => {
      prisma.wish.findFirst.mockResolvedValue({
        id: 'wish-1',
        invitationId: 'inv-1',
        isApproved: false,
      });
      prisma.wish.update.mockResolvedValue({
        id: 'wish-1',
        invitationId: 'inv-1',
        isApproved: true,
      });

      const result = await service.toggleApproval('inv-1', 'wish-1');

      expect(prisma.wish.update).toHaveBeenCalledWith({
        where: { id: 'wish-1' },
        data: { isApproved: true },
      });
      expect(result.isApproved).toBe(true);
    });

    it('should throw NotFoundException if wish not found in invitation', async () => {
      prisma.wish.findFirst.mockResolvedValue(null);

      await expect(service.toggleApproval('inv-1', 'wish-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
