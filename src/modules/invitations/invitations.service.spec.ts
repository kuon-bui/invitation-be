import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsService } from './invitations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
import { InvitationStatus } from '@prisma/client';

describe('InvitationsService', () => {
  let service: InvitationsService;
  let prisma: Partial<PrismaService>;
  let cache: any;

  beforeEach(async () => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    prisma = {
      invitation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
  });

  describe('findBySlug', () => {
    it('should return cached invitation on findBySlug if present', async () => {
      const cachedData = { id: 'inv-1', slug: 'quan-dung' };
      cache.get.mockResolvedValue(cachedData);

      const result = await service.findBySlug('quan-dung');
      expect(result).toEqual(cachedData);
      expect(prisma.invitation!.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from DB and cache if not in cache on findBySlug', async () => {
      cache.get.mockResolvedValue(null);
      const dbData = { id: 'inv-1', slug: 'quan-dung', template: { name: 'Duyên dáng 01' } };
      (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue(dbData);

      const result = await service.findBySlug('quan-dung');
      expect(result).toEqual(dbData);
      expect(cache.set).toHaveBeenCalledWith('invitation:slug:quan-dung', dbData, 300000);
      expect(prisma.invitation!.findUnique).toHaveBeenCalledWith({
        where: { slug: 'quan-dung' },
        include: { template: true },
      });
    });

    it('should throw NotFoundException if invitation not found by slug', async () => {
      cache.get.mockResolvedValue(null);
      (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findBySlug('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByUser', () => {
    it('should return invitations for user', async () => {
      const invitations = [{ id: 'inv-1', userId: 'user-1' }];
      (prisma.invitation!.findMany as jest.Mock).mockResolvedValue(invitations);

      const result = await service.findAllByUser('user-1');
      expect(result).toEqual(invitations);
      expect(prisma.invitation!.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { template: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return invitation by id', async () => {
      const inv = { id: 'inv-1', title: 'Wedding' };
      (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue(inv);

      const result = await service.findOne('inv-1');
      expect(result).toEqual(inv);
    });

    it('should throw NotFoundException if invitation not found by id', async () => {
      (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create invitation with TRIAL status, 5-day trial, and clean slug', async () => {
      (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue(null);
      const createdInv = {
        id: 'inv-1',
        userId: 'user-1',
        title: 'Đám cưới Văn Quân & Thùy Dung',
        slug: 'dam-cuoi-van-quan-thuy-dung',
        status: InvitationStatus.TRIAL,
      };
      (prisma.invitation!.create as jest.Mock).mockResolvedValue(createdInv);

      const dto = {
        templateId: 'tpl-1',
        title: 'Đám cưới Văn Quân & Thùy Dung',
        eventDate: new Date('2026-11-20'),
        venueName: 'Trống Đồng',
        venueAddress: 'Hà Nội',
      };

      const result = await service.create('user-1', dto as any);
      expect(result).toEqual(createdInv);
      expect(prisma.invitation!.create).toHaveBeenCalled();
      const callData = (prisma.invitation!.create as jest.Mock).mock.calls[0][0].data;
      expect(callData.status).toBe(InvitationStatus.TRIAL);
      expect(callData.slug).toBe('dam-cuoi-van-quan-thuy-dung');
      expect(callData.userId).toBe('user-1');
      expect(callData.trialEndsAt).toBeInstanceOf(Date);
      const diffDays = (callData.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(4.9);
      expect(diffDays).toBeLessThanOrEqual(5.1);
    });

    it('should handle duplicate slugs by appending unique suffix', async () => {
      // First call finds existing invitation, second call returns null (unique)
      (prisma.invitation!.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'existing' })
        .mockResolvedValueOnce(null);

      (prisma.invitation!.create as jest.Mock).mockImplementation(({ data }) => Promise.resolve({ id: 'inv-2', ...data }));

      const dto = {
        templateId: 'tpl-1',
        title: 'Cưới',
        eventDate: new Date('2026-11-20'),
        venueName: 'Trống Đồng',
        venueAddress: 'Hà Nội',
      };

      const result = await service.create('user-1', dto as any);
      expect(result.slug).toMatch(/^cuoi-[a-z0-9]+$/);
    });
  });

  describe('update', () => {
    it('should invalidate cache when invitation is updated', async () => {
      const existing = { id: 'inv-1', slug: 'quan-dung' };
      (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue(existing);
      (prisma.invitation!.update as jest.Mock).mockResolvedValue({ ...existing, title: 'New Title' });

      await service.update('inv-1', { title: 'New Title' });
      expect(cache.del).toHaveBeenCalledWith('invitation:slug:quan-dung');
      expect(prisma.invitation!.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: expect.objectContaining({ title: 'New Title' }),
      });
    });

    it('should throw NotFoundException on update if invitation not found', async () => {
      (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update('inv-missing', { title: 'New' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete invitation and invalidate cache', async () => {
      const existing = { id: 'inv-1', slug: 'quan-dung' };
      (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue(existing);
      (prisma.invitation!.delete as jest.Mock).mockResolvedValue(existing);

      const result = await service.remove('inv-1');
      expect(result).toEqual(existing);
      expect(prisma.invitation!.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
      expect(cache.del).toHaveBeenCalledWith('invitation:slug:quan-dung');
    });

    it('should throw NotFoundException on remove if invitation not found', async () => {
      (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.remove('inv-missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cleanSlug helper', () => {
    it('should convert Vietnamese text with accents and special characters into clean slug', () => {
      expect(service.cleanSlug('Đám cưới Văn Quân & Thùy Dung!')).toBe('dam-cuoi-van-quan-thuy-dung');
      expect(service.cleanSlug('  Họp Lớp -- 12A1 (2026)  ')).toBe('hop-lop-12a1-2026');
      expect(service.cleanSlug('ĐẶC BIỆT: Ngày Kỷ Niệm')).toBe('dac-biet-ngay-ky-niem');
    });
  });
});
