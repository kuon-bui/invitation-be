import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateInvitationDto } from './dto/update-invitation.dto';
import { InvitationStatus } from '@prisma/client';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  cleanSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async generateUniqueSlug(baseText: string): Promise<string> {
    const baseSlug = this.cleanSlug(baseText) || 'invitation';
    let candidateSlug = baseSlug;

    const existing = await this.prisma.invitation.findUnique({
      where: { slug: candidateSlug },
    });

    if (!existing) {
      return candidateSlug;
    }

    while (true) {
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      const slugWithSuffix = `${baseSlug}-${randomSuffix}`;
      const check = await this.prisma.invitation.findUnique({
        where: { slug: slugWithSuffix },
      });
      if (!check) {
        return slugWithSuffix;
      }
    }
  }

  async findBySlug(slug: string) {
    const cacheKey = `invitation:slug:${slug}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const invitation = await this.prisma.invitation.findUnique({
      where: { slug },
      include: { template: true },
    });

    if (!invitation) {
      throw new NotFoundException(`Invitation with slug "${slug}" not found`);
    }

    await this.cacheManager.set(cacheKey, invitation, 300000);
    return invitation;
  }

  async findAllByUser(userId: string) {
    return this.prisma.invitation.findMany({
      where: { userId },
      include: { template: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
      include: { template: true },
    });

    if (!invitation) {
      throw new NotFoundException(`Invitation with ID "${id}" not found`);
    }

    return invitation;
  }

  async getOrCreateTrialUser(): Promise<string> {
    const trialEmail = 'guest-trial@motdoi.vn';
    const existing = await this.prisma.user.findUnique({
      where: { email: trialEmail },
    });
    if (existing) {
      return existing.id;
    }
    const created = await this.prisma.user.create({
      data: {
        email: trialEmail,
        fullName: 'Khách dùng thử',
      },
    });
    return created.id;
  }

  async createTrial(dto: CreateInvitationDto) {
    const userId = await this.getOrCreateTrialUser();
    return this.create(userId, dto);
  }

  async create(userId: string, dto: CreateInvitationDto) {
    const slug = await this.generateUniqueSlug(dto.slug || dto.title);
    const trialEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

    const { slug: _dtoSlug, ...rest } = dto;

    return this.prisma.invitation.create({
      data: {
        ...rest,
        userId,
        slug,
        status: InvitationStatus.TRIAL,
        trialEndsAt,
        details: dto.details ?? {},
        customConfig: dto.customConfig ?? {},
      } as any,
      include: { template: true },
    });
  }

  async update(id: string, dto: UpdateInvitationDto) {
    const existing = await this.prisma.invitation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Invitation with ID "${id}" not found`);
    }

    let newSlug: string | undefined = undefined;
    if (dto.slug && dto.slug !== existing.slug) {
      newSlug = await this.generateUniqueSlug(dto.slug);
    }

    const dataToUpdate = {
      ...dto,
      ...(newSlug ? { slug: newSlug } : {}),
    };

    const updated = await this.prisma.invitation.update({
      where: { id },
      data: dataToUpdate as any,
    });

    await this.cacheManager.del(`invitation:slug:${existing.slug}`);
    if (updated.slug !== existing.slug) {
      await this.cacheManager.del(`invitation:slug:${updated.slug}`);
    }

    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.invitation.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Invitation with ID "${id}" not found`);
    }

    const deleted = await this.prisma.invitation.delete({
      where: { id },
    });

    await this.cacheManager.del(`invitation:slug:${existing.slug}`);
    return deleted;
  }
}
