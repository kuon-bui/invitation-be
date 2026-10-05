import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWishDto } from './dto/create-wish.dto';
import { QueryWishDto } from './dto/query-wish.dto';

@Injectable()
export class WishesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(invitationId: string, dto: CreateWishDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) {
      throw new NotFoundException(`Invitation with ID "${invitationId}" not found`);
    }

    const wish = await this.prisma.wish.create({
      data: {
        invitationId,
        senderName: dto.senderName,
        content: dto.content,
        isApproved: true,
      },
    });

    this.eventEmitter.emit('wish.created', { invitationId, wish });

    return wish;
  }

  async findApprovedByInvitation(invitationId: string, query?: QueryWishDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation) {
      throw new NotFoundException(`Invitation with ID "${invitationId}" not found`);
    }

    const page = query?.page ? Number(query.page) : 1;
    const limit = query?.limit ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.wish.findMany({
        where: { invitationId, isApproved: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.wish.count({
        where: { invitationId, isApproved: true },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async toggleApproval(invitationId: string, wishId: string) {
    const wish = await this.prisma.wish.findFirst({
      where: { id: wishId, invitationId },
    });
    if (!wish) {
      throw new NotFoundException(`Wish with ID "${wishId}" not found for this invitation`);
    }

    return this.prisma.wish.update({
      where: { id: wishId },
      data: { isApproved: !wish.isApproved },
    });
  }
}
