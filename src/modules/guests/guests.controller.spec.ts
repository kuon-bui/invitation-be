import { Test, TestingModule } from '@nestjs/testing';
import { GuestsController } from './guests.controller';
import { PublicGuestsController } from './public-guests.controller';
import { GuestsService } from './guests.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GuestSide } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import type { Response } from 'express';

describe('GuestsController and PublicGuestsController', () => {
  let guestsController: GuestsController;
  let publicGuestsController: PublicGuestsController;
  let service: Partial<Record<keyof GuestsService, jest.Mock>>;

  beforeEach(async () => {
    service = {
      findBySlugAndCode: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
      importFromExcel: jest.fn(),
      exportToExcel: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuestsController, PublicGuestsController],
      providers: [
        {
          provide: GuestsService,
          useValue: service,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    guestsController = module.get<GuestsController>(GuestsController);
    publicGuestsController = module.get<PublicGuestsController>(PublicGuestsController);
  });

  describe('PublicGuestsController', () => {
    it('findBySlugAndCode should return invitation and guest info', async () => {
      const mockResult = {
        invitation: { id: 'inv-1', slug: 'quan-dung' },
        guest: { id: 'g-1', name: 'Anh Nam', hasViewed: true },
      };
      service.findBySlugAndCode!.mockResolvedValue(mockResult);

      const result = await publicGuestsController.findBySlugAndCode('quan-dung', 'ABC123');
      expect(result).toBe(mockResult);
      expect(service.findBySlugAndCode).toHaveBeenCalledWith('quan-dung', 'ABC123');
    });
  });

  describe('GuestsController', () => {
    it('findAll should return guest list for wedding', async () => {
      const mockGuests = [{ id: 'g-1', name: 'Nguyen Van A' }];
      service.findAll!.mockResolvedValue(mockGuests);

      const query = { side: GuestSide.TRAI, hasViewed: true };
      const result = await guestsController.findAll('inv-1', query);

      expect(result).toBe(mockGuests);
      expect(service.findAll).toHaveBeenCalledWith('inv-1', query);
    });

    it('create should create and return a new guest', async () => {
      const dto = { name: 'Nguyen Van B', side: GuestSide.GAI, phone: '0901234567' };
      const mockCreated = { id: 'g-2', weddingId: 'inv-1', ...dto, code: 'DEF456' };
      service.create!.mockResolvedValue(mockCreated);

      const result = await guestsController.create('inv-1', dto);
      expect(result).toBe(mockCreated);
      expect(service.create).toHaveBeenCalledWith('inv-1', dto);
    });

    it('importGuests should import from uploaded file buffer', async () => {
      const mockFile = {
        buffer: Buffer.from('mock excel data'),
      } as Express.Multer.File;
      service.importFromExcel!.mockResolvedValue({ count: 5 });

      const result = await guestsController.importGuests('inv-1', mockFile);
      expect(result).toEqual({ count: 5 });
      expect(service.importFromExcel).toHaveBeenCalledWith('inv-1', mockFile.buffer);
    });

    it('importGuests should throw BadRequestException if no file or buffer provided', async () => {
      await expect(guestsController.importGuests('inv-1', undefined, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('exportGuests should export excel buffer with appropriate headers', async () => {
      const mockBuffer = Buffer.from('mock excel binary');
      service.exportToExcel!.mockResolvedValue(mockBuffer);

      const res = {
        setHeader: jest.fn(),
        end: jest.fn(),
      } as unknown as Response;

      await guestsController.exportGuests('inv-1', res);

      expect(service.exportToExcel).toHaveBeenCalledWith('inv-1');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="guests.xlsx"',
      );
      expect(res.end).toHaveBeenCalledWith(mockBuffer);
    });

    it('remove should delete guest', async () => {
      const mockDeleted = { id: 'g-1' };
      service.remove!.mockResolvedValue(mockDeleted);

      const result = await guestsController.remove('inv-1', 'g-1');
      expect(result).toBe(mockDeleted);
      expect(service.remove).toHaveBeenCalledWith('inv-1', 'g-1');
    });
  });
});
