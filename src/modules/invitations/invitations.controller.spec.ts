import { Test, TestingModule } from '@nestjs/testing';
import { InvitationsController } from './invitations.controller';
import { MyInvitationsController } from './my-invitations.controller';
import { InvitationsService } from './invitations.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('InvitationsController and MyInvitationsController', () => {
  let publicController: InvitationsController;
  let myController: MyInvitationsController;
  let service: Partial<Record<keyof InvitationsService, jest.Mock>>;

  beforeEach(async () => {
    service = {
      findBySlug: jest.fn(),
      findAllByUser: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController, MyInvitationsController],
      providers: [
        {
          provide: InvitationsService,
          useValue: service,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    publicController = module.get<InvitationsController>(InvitationsController);
    myController = module.get<MyInvitationsController>(MyInvitationsController);
  });

  describe('InvitationsController (Public)', () => {
    it('findBySlug should return invitation by slug', async () => {
      const mockResult = { id: 'inv-1', slug: 'quan-dung' };
      service.findBySlug!.mockResolvedValue(mockResult);

      const result = await publicController.findBySlug('quan-dung');
      expect(result).toBe(mockResult);
      expect(service.findBySlug).toHaveBeenCalledWith('quan-dung');
    });
  });

  describe('MyInvitationsController (Auth)', () => {
    it('findAll should return user invitations', async () => {
      const mockList = [{ id: 'inv-1', userId: 'user-1' }];
      service.findAllByUser!.mockResolvedValue(mockList);

      const result = await myController.findAll('user-1');
      expect(result).toBe(mockList);
      expect(service.findAllByUser).toHaveBeenCalledWith('user-1');
    });

    it('findOne should return invitation by id', async () => {
      const mockInv = { id: 'inv-1', userId: 'user-1' };
      service.findOne!.mockResolvedValue(mockInv);

      const result = await myController.findOne('inv-1');
      expect(result).toBe(mockInv);
      expect(service.findOne).toHaveBeenCalledWith('inv-1');
    });

    it('create should call service.create with userId and dto', async () => {
      const dto = {
        templateId: 'tpl-1',
        title: 'Title',
        eventDate: new Date('2026-11-20'),
        venueName: 'Venue',
        venueAddress: 'Address',
      };
      const created = { id: 'inv-1', ...dto };
      service.create!.mockResolvedValue(created);

      const result = await myController.create('user-1', dto as any);
      expect(result).toBe(created);
      expect(service.create).toHaveBeenCalledWith('user-1', dto);
    });

    it('update should call service.update with id and dto', async () => {
      const dto = { title: 'Updated Title' };
      const updated = { id: 'inv-1', title: 'Updated Title' };
      service.update!.mockResolvedValue(updated);

      const result = await myController.update('inv-1', dto as any);
      expect(result).toBe(updated);
      expect(service.update).toHaveBeenCalledWith('inv-1', dto);
    });

    it('remove should call service.remove with id', async () => {
      const deleted = { id: 'inv-1' };
      service.remove!.mockResolvedValue(deleted);

      const result = await myController.remove('inv-1');
      expect(result).toBe(deleted);
      expect(service.remove).toHaveBeenCalledWith('inv-1');
    });
  });
});
