import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRsvpDto } from './dto/create-rsvp.dto';

@Injectable()
export class RsvpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(invitationId: string, dto: CreateRsvpDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) {
      throw new NotFoundException(`Invitation with ID "${invitationId}" not found`);
    }

    const rsvp = await this.prisma.rsvp.create({
      data: {
        invitationId,
        guestId: dto.guestId,
        guestName: dto.guestName,
        attending: dto.attending,
        guestCount: dto.guestCount ?? 1,
        diet: dto.diet,
        note: dto.note,
      },
    });

    this.eventEmitter.emit('rsvp.created', { invitationId, rsvp });

    return rsvp;
  }

  async findAllByInvitation(invitationId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) {
      throw new NotFoundException(`Invitation with ID "${invitationId}" not found`);
    }

    const rsvps = await this.prisma.rsvp.findMany({
      where: { invitationId },
      include: { guest: true },
      orderBy: { createdAt: 'desc' },
    });

    const attendingRsvps = rsvps.filter((r) => r.attending);
    const declinedCount = rsvps.filter((r) => !r.attending).length;
    const totalGuests = attendingRsvps.reduce(
      (sum, r) => sum + (r.guestCount ?? 1),
      0,
    );

    let chay = 0;
    let man = 0;
    let other = 0;

    for (const r of attendingRsvps) {
      if (!r.diet) continue;
      const d = r.diet.trim().toLowerCase();
      if (d === 'chay') {
        chay++;
      } else if (d === 'man' || d === 'mặn') {
        man++;
      } else {
        other++;
      }
    }

    return {
      stats: {
        total: rsvps.length,
        attending: attendingRsvps.length,
        declined: declinedCount,
        totalGuests,
        dietStats: {
          chay,
          man,
          other,
        },
      },
      rsvps,
    };
  }
}
