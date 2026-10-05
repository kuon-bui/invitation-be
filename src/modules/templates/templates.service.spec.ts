import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let prisma: {
    template: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      template: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
  });

  describe('findAll', () => {
    it('should find all templates including inactive', async () => {
      const mockTemplates = [
        { id: 't1', name: 'T1', isActive: false },
        { id: 't2', name: 'T2', isActive: true },
      ];
      prisma.template.findMany.mockResolvedValue(mockTemplates);

      const result = await service.findAll();
      expect(result).toEqual(mockTemplates);
      expect(prisma.template.findMany).toHaveBeenCalledWith({
        orderBy: { order: 'asc' },
      });
    });
  });

  describe('findAllActive', () => {
    it('should find all active templates by eventType', async () => {
      const mockTemplates = [
        { id: 'duyen-dang-01', name: 'Duyên dáng 01', isActive: true, eventType: 'WEDDING' },
      ];
      prisma.template.findMany.mockResolvedValue(mockTemplates);

      const result = await service.findAllActive('WEDDING' as any);
      expect(result).toHaveLength(1);
      expect(prisma.template.findMany).toHaveBeenCalledWith({
        where: { isActive: true, eventType: 'WEDDING' },
        orderBy: { order: 'asc' },
      });
    });

    it('should find all active templates without eventType', async () => {
      prisma.template.findMany.mockResolvedValue([]);

      const result = await service.findAllActive();
      expect(result).toEqual([]);
      expect(prisma.template.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return template when found', async () => {
      const mockTemplate = { id: 'truyen-thong-01', name: 'Truyền thống 01' };
      prisma.template.findUnique.mockResolvedValue(mockTemplate);

      const result = await service.findOne('truyen-thong-01');
      expect(result).toEqual(mockTemplate);
      expect(prisma.template.findUnique).toHaveBeenCalledWith({
        where: { id: 'truyen-thong-01' },
      });
    });

    it('should throw NotFoundException when template not found', async () => {
      prisma.template.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create template with JSON config', async () => {
      const dto = {
        id: 'test-template',
        name: 'Test Template',
        eventType: 'WEDDING' as const,
        category: 'hien-dai',
        styleDesc: 'Thanh lịch',
        config: { colors: { primary: '#000' } },
      };

      prisma.template.create.mockResolvedValue(dto);

      const result = await service.create(dto as any);
      expect(result.id).toBe('test-template');
      expect(prisma.template.create).toHaveBeenCalledWith({
        data: dto,
      });
    });
  });

  describe('update', () => {
    it('should update template', async () => {
      const existing = { id: 'test-template', name: 'Test Template' };
      const updateDto = { name: 'Updated Name' };
      const updated = { ...existing, ...updateDto };

      prisma.template.findUnique.mockResolvedValue(existing);
      prisma.template.update.mockResolvedValue(updated);

      const result = await service.update('test-template', updateDto as any);
      expect(result.name).toBe('Updated Name');
      expect(prisma.template.update).toHaveBeenCalledWith({
        where: { id: 'test-template' },
        data: updateDto,
      });
    });

    it('should throw NotFoundException if template to update does not exist', async () => {
      prisma.template.findUnique.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete template', async () => {
      const existing = { id: 'test-template', name: 'Test' };
      prisma.template.findUnique.mockResolvedValue(existing);
      prisma.template.delete.mockResolvedValue(existing);

      const result = await service.remove('test-template');
      expect(result).toEqual(existing);
      expect(prisma.template.delete).toHaveBeenCalledWith({
        where: { id: 'test-template' },
      });
    });

    it('should throw NotFoundException if template to remove does not exist', async () => {
      prisma.template.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
