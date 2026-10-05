import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { TemplatesController } from './templates.controller';
import { AdminTemplatesController } from './admin-templates.controller';
import { TemplatesService } from './templates.service';
import { EventType, Role } from '@prisma/client';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('TemplatesController and AdminTemplatesController', () => {
  let controller: TemplatesController;
  let adminController: AdminTemplatesController;
  let service: Partial<Record<keyof TemplatesService, jest.Mock>>;
  let reflector: Reflector;

  beforeEach(async () => {
    service = {
      findAllActive: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController, AdminTemplatesController],
      providers: [
        {
          provide: TemplatesService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<TemplatesController>(TemplatesController);
    adminController = module.get<AdminTemplatesController>(AdminTemplatesController);
    reflector = new Reflector();
  });

  describe('TemplatesController', () => {
    it('findAll should return active templates with eventType', async () => {
      const mockResult = [{ id: 't1', name: 'T1' }];
      service.findAllActive!.mockResolvedValue(mockResult);

      const result = await controller.findAll(EventType.WEDDING);
      expect(result).toBe(mockResult);
      expect(service.findAllActive).toHaveBeenCalledWith(EventType.WEDDING);
    });

    it('findOne should return a template by id', async () => {
      const mockResult = { id: 't1', name: 'T1' };
      service.findOne!.mockResolvedValue(mockResult);

      const result = await controller.findOne('t1');
      expect(result).toBe(mockResult);
      expect(service.findOne).toHaveBeenCalledWith('t1');
    });
  });

  describe('AdminTemplatesController', () => {
    it('should have ADMIN role metadata', () => {
      const roles = reflector.get(ROLES_KEY, AdminTemplatesController);
      expect(roles).toEqual([Role.ADMIN]);
    });

    it('create should call service.create', async () => {
      const dto = {
        id: 't-new',
        name: 'New',
        category: 'hien-dai',
        styleDesc: 'Desc',
        config: {},
      };
      service.create!.mockResolvedValue(dto);

      const result = await adminController.create(dto as any);
      expect(result).toBe(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
    });

    it('update should call service.update', async () => {
      const dto = { name: 'Updated' };
      const updated = { id: 't1', name: 'Updated' };
      service.update!.mockResolvedValue(updated);

      const result = await adminController.update('t1', dto as any);
      expect(result).toBe(updated);
      expect(service.update).toHaveBeenCalledWith('t1', dto);
    });

    it('remove should call service.remove', async () => {
      const deleted = { id: 't1', name: 'T1' };
      service.remove!.mockResolvedValue(deleted);

      const result = await adminController.remove('t1');
      expect(result).toBe(deleted);
      expect(service.remove).toHaveBeenCalledWith('t1');
    });
  });
});

