import { Test, TestingModule } from '@nestjs/testing';
import { GuestsService } from './guests.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { GuestSide } from '@prisma/client';
import * as ExcelJS from 'exceljs';

describe('GuestsService', () => {
  let service: GuestsService;
  let prisma: Partial<PrismaService>;

  beforeEach(async () => {
    prisma = {
      guest: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      } as any,
      invitation: {
        findUnique: jest.fn(),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuestsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<GuestsService>(GuestsService);
  });

  it('should generate a 6-character uppercase alphanumeric code', () => {
    const code = service.generateGuestCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('should mark guest viewed and return invitation and guest on findBySlugAndCode', async () => {
    (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue({ id: 'inv-1', slug: 'quan-dung' });
    (prisma.guest!.findFirst as jest.Mock).mockResolvedValue({ id: 'g-1', name: 'Anh Nam', weddingId: 'inv-1', code: 'ABC123' });
    (prisma.guest!.update as jest.Mock).mockResolvedValue({ id: 'g-1', name: 'Anh Nam', hasViewed: true });

    const result = await service.findBySlugAndCode('quan-dung', 'ABC123');
    expect(result.guest.hasViewed).toBe(true);
    expect(prisma.guest!.update).toHaveBeenCalled();
  });

  it('should throw NotFoundException if invitation not found in findBySlugAndCode', async () => {
    (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.findBySlugAndCode('not-found', 'ABC123')).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if guest code does not match invitation', async () => {
    (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue({ id: 'inv-1', slug: 'quan-dung' });
    (prisma.guest!.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.findBySlugAndCode('quan-dung', 'WRONG')).rejects.toThrow(NotFoundException);
  });

  it('should findAll guests with filters', async () => {
    const mockGuests = [
      { id: 'g-1', name: 'Nguyen Van A', weddingId: 'inv-1', side: GuestSide.TRAI, hasViewed: true },
    ];
    (prisma.guest!.findMany as jest.Mock).mockResolvedValue(mockGuests);

    const result = await service.findAll('inv-1', {
      search: 'Van',
      side: GuestSide.TRAI,
      hasViewed: true,
    });

    expect(result).toEqual(mockGuests);
    expect(prisma.guest!.findMany).toHaveBeenCalledWith({
      where: {
        weddingId: 'inv-1',
        name: { contains: 'Van', mode: 'insensitive' },
        side: GuestSide.TRAI,
        hasViewed: true,
      },
      include: { rsvps: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should create guest with generated code', async () => {
    (prisma.guest!.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.guest!.create as jest.Mock).mockResolvedValue({
      id: 'g-1',
      weddingId: 'inv-1',
      name: 'Nguyen Van B',
      side: GuestSide.GAI,
      phone: '0901234567',
      code: 'K9Z8A1',
    });

    const result = await service.create('inv-1', {
      name: 'Nguyen Van B',
      side: GuestSide.GAI,
      phone: '0901234567',
    });

    expect(result.name).toBe('Nguyen Van B');
    expect(prisma.guest!.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          weddingId: 'inv-1',
          name: 'Nguyen Van B',
          side: GuestSide.GAI,
          phone: '0901234567',
        }),
      }),
    );
  });

  it('should delete guest when found', async () => {
    (prisma.guest!.findFirst as jest.Mock).mockResolvedValue({ id: 'g-1', weddingId: 'inv-1' });
    (prisma.guest!.delete as jest.Mock).mockResolvedValue({ id: 'g-1' });

    const result = await service.remove('inv-1', 'g-1');
    expect(result).toEqual({ id: 'g-1' });
    expect(prisma.guest!.delete).toHaveBeenCalledWith({ where: { id: 'g-1' } });
  });

  it('should throw NotFoundException when deleting non-existent guest', async () => {
    (prisma.guest!.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.remove('inv-1', 'non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should import guests from excel buffer and skip invalid rows', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    worksheet.addRow(['Tên khách', 'Họ nhà', 'Số điện thoại']);
    worksheet.addRow(['Khách 1', 'trai', '0912345678']);
    worksheet.addRow(['Khách 2', 'gái', '0987654321']);
    worksheet.addRow(['', '', '']); // Empty row to skip
    worksheet.addRow(['Khách 3', 'chung', '']);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    (prisma.guest!.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.guest!.createMany as jest.Mock).mockResolvedValue({ count: 3 });

    const result = await service.importFromExcel('inv-1', buffer);
    expect(result.count).toBe(3);
    expect(prisma.guest!.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'Khách 1', side: GuestSide.TRAI, phone: '0912345678' }),
        expect.objectContaining({ name: 'Khách 2', side: GuestSide.GAI, phone: '0987654321' }),
        expect.objectContaining({ name: 'Khách 3', side: GuestSide.CHUNG }),
      ]),
    });
  });

  it('should export guests to excel buffer', async () => {
    (prisma.guest!.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'g-1',
        name: 'Khách 1',
        side: GuestSide.TRAI,
        phone: '0912345678',
        code: 'ABC123',
        hasViewed: true,
        rsvps: [
          {
            attending: true,
            guestCount: 2,
            diet: 'chay',
            note: 'Chuc mung hanh phuc',
          },
        ],
      },
      {
        id: 'g-2',
        name: 'Khách 2',
        side: GuestSide.GAI,
        phone: null,
        code: 'DEF456',
        hasViewed: false,
        rsvps: [],
      },
    ]);

    const buffer = await service.exportToExcel('inv-1');
    expect(Buffer.isBuffer(buffer)).toBe(true);

    const readWorkbook = new ExcelJS.Workbook();
    await readWorkbook.xlsx.load(buffer as any);
    const sheet = readWorkbook.worksheets[0];
    expect(sheet).toBeDefined();
    expect(sheet.rowCount).toBeGreaterThanOrEqual(3); // header + 2 rows
  });
});
