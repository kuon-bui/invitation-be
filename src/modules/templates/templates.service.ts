import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { EventType } from '@prisma/client';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllActive(eventType?: EventType) {
    const where: { isActive: boolean; eventType?: EventType } = { isActive: true };
    if (eventType) {
      where.eventType = eventType;
    }

    return this.prisma.template.findMany({
      where,
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException(`Template with ID "${id}" not found`);
    }
    return template;
  }

  async create(dto: CreateTemplateDto) {
    return this.prisma.template.create({
      data: dto as any,
    });
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.findOne(id);
    return this.prisma.template.update({
      where: { id },
      data: dto as any,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.template.delete({
      where: { id },
    });
  }
}
