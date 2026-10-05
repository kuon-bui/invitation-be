import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { QueryGuestDto } from './dto/query-guest.dto';
import { GuestSide } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class GuestsService {
  constructor(private readonly prisma: PrismaService) {}

  generateGuestCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async generateUniqueCode(weddingId: string): Promise<string> {
    while (true) {
      const code = this.generateGuestCode();
      const existing = await this.prisma.guest.findFirst({
        where: { weddingId, code },
      });
      if (!existing) {
        return code;
      }
    }
  }

  async findBySlugAndCode(slug: string, code: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { slug },
    });
    if (!invitation) {
      throw new NotFoundException(`Invitation with slug "${slug}" not found`);
    }

    const guest = await this.prisma.guest.findFirst({
      where: { weddingId: invitation.id, code },
    });
    if (!guest) {
      throw new NotFoundException(`Guest with code "${code}" not found for this invitation`);
    }

    const updatedGuest = await this.prisma.guest.update({
      where: { id: guest.id },
      data: {
        hasViewed: true,
        viewedAt: new Date(),
      },
    });

    return {
      invitation,
      guest: updatedGuest,
    };
  }

  async findAll(weddingId: string, query?: QueryGuestDto) {
    const where: any = { weddingId };

    if (query?.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }
    if (query?.side) {
      where.side = query.side;
    }
    if (query?.hasViewed !== undefined) {
      where.hasViewed = query.hasViewed;
    }

    return this.prisma.guest.findMany({
      where,
      include: { rsvps: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(weddingId: string, dto: CreateGuestDto) {
    const code = await this.generateUniqueCode(weddingId);
    return this.prisma.guest.create({
      data: {
        weddingId,
        name: dto.name,
        side: dto.side ?? GuestSide.CHUNG,
        phone: dto.phone,
        code,
      },
    });
  }

  async remove(weddingId: string, guestId: string) {
    const guest = await this.prisma.guest.findFirst({
      where: { id: guestId, weddingId },
    });
    if (!guest) {
      throw new NotFoundException(`Guest with ID "${guestId}" not found`);
    }

    return this.prisma.guest.delete({
      where: { id: guestId },
    });
  }

  async importFromExcel(weddingId: string, buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return { count: 0 };
    }

    const existingGuests = await this.prisma.guest.findMany({
      where: { weddingId },
      select: { code: true },
    });
    const usedCodes = new Set<string>(existingGuests?.map((g) => g.code) ?? []);

    const guestsToCreate: Array<{
      weddingId: string;
      name: string;
      side: GuestSide;
      phone?: string | null;
      code: string;
    }> = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const cell1 = row.getCell(1).text || row.getCell(1).value?.toString();
      const name = cell1?.trim();
      if (!name) return;

      const cell2 = (row.getCell(2).text || row.getCell(2).value?.toString() || '').trim().toLowerCase();
      let side: GuestSide = GuestSide.CHUNG;
      if (cell2 === 'trai' || cell2 === 'nhà trai' || cell2 === 'nha trai') {
        side = GuestSide.TRAI;
      } else if (cell2 === 'gai' || cell2 === 'gái' || cell2 === 'nhà gái' || cell2 === 'nha gai') {
        side = GuestSide.GAI;
      }

      const cell3 = row.getCell(3).text || row.getCell(3).value?.toString();
      const phone = cell3?.trim() || null;

      let code = this.generateGuestCode();
      while (usedCodes.has(code)) {
        code = this.generateGuestCode();
      }
      usedCodes.add(code);

      guestsToCreate.push({
        weddingId,
        name,
        side,
        phone,
        code,
      });
    });

    if (guestsToCreate.length === 0) {
      return { count: 0 };
    }

    const result = await this.prisma.guest.createMany({
      data: guestsToCreate,
    });

    return { count: result.count };
  }

  async exportToExcel(weddingId: string): Promise<Buffer> {
    const guests = await this.prisma.guest.findMany({
      where: { weddingId },
      include: { rsvps: true },
      orderBy: { createdAt: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Khách mời');

    worksheet.columns = [
      { header: 'Tên khách', key: 'name', width: 25 },
      { header: 'Họ nhà', key: 'side', width: 15 },
      { header: 'SĐT', key: 'phone', width: 15 },
      { header: 'Mã link', key: 'code', width: 12 },
      { header: 'Đã xem thiệp', key: 'hasViewed', width: 15 },
      { header: 'Trạng thái RSVP', key: 'rsvpStatus', width: 20 },
      { header: 'Số người đi cùng', key: 'guestCount', width: 18 },
      { header: 'Chế độ ăn', key: 'diet', width: 15 },
      { header: 'Lời nhắn', key: 'note', width: 35 },
    ];

    worksheet.getRow(1).font = { bold: true };

    const sideMap: Record<GuestSide, string> = {
      [GuestSide.TRAI]: 'Trai',
      [GuestSide.GAI]: 'Gái',
      [GuestSide.CHUNG]: 'Chung',
    };

    for (const guest of guests) {
      const latestRsvp = guest.rsvps?.[guest.rsvps.length - 1];
      let rsvpStatus = 'Chưa phản hồi';
      let guestCount: number | string = '';
      let diet = '';
      let note = '';

      if (latestRsvp) {
        rsvpStatus = latestRsvp.attending ? 'Tham dự' : 'Không tham dự';
        guestCount = latestRsvp.guestCount ?? 1;
        diet = latestRsvp.diet ?? '';
        note = latestRsvp.note ?? '';
      }

      worksheet.addRow({
        name: guest.name,
        side: sideMap[guest.side] || guest.side,
        phone: guest.phone || '',
        code: guest.code,
        hasViewed: guest.hasViewed ? 'Đã xem' : 'Chưa xem',
        rsvpStatus,
        guestCount,
        diet,
        note,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
