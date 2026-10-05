import { Test, TestingModule } from '@nestjs/testing';
import { WishesController } from './wishes.controller';
import { MyWishesController } from './my-wishes.controller';
import { WishesService } from './wishes.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('WishesController and MyWishesController', () => {
  let wishesController: WishesController;
  let myWishesController: MyWishesController;
  let wishesService: Partial<Record<keyof WishesService, jest.Mock>>;

  beforeEach(async () => {
    wishesService = {
      create: jest.fn(),
      findApprovedByInvitation: jest.fn(),
      toggleApproval: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WishesController, MyWishesController],
      providers: [
        {
          provide: WishesService,
          useValue: wishesService,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    wishesController = module.get<WishesController>(WishesController);
    myWishesController = module.get<MyWishesController>(MyWishesController);
  });

  describe('WishesController', () => {
    it('create should call service.create with invitation id and dto', async () => {
      const dto = { senderName: 'Nguyen Van A', content: 'Chuc mung' };
      const mockResult = { id: 'w-1', ...dto, isApproved: true };
      wishesService.create!.mockResolvedValue(mockResult);

      const result = await wishesController.create('inv-1', dto);

      expect(result).toBe(mockResult);
      expect(wishesService.create).toHaveBeenCalledWith('inv-1', dto);
    });

    it('findAll should call service.findApprovedByInvitation with invitation id and query', async () => {
      const query = { page: 1, limit: 10 };
      const mockResult = { data: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      wishesService.findApprovedByInvitation!.mockResolvedValue(mockResult);

      const result = await wishesController.findAll('inv-1', query);

      expect(result).toBe(mockResult);
      expect(wishesService.findApprovedByInvitation).toHaveBeenCalledWith('inv-1', query);
    });
  });

  describe('MyWishesController', () => {
    it('toggle should call service.toggleApproval with invitation id and wish id', async () => {
      const mockResult = { id: 'w-1', isApproved: false };
      wishesService.toggleApproval!.mockResolvedValue(mockResult);

      const result = await myWishesController.toggle('inv-1', 'w-1');

      expect(result).toBe(mockResult);
      expect(wishesService.toggleApproval).toHaveBeenCalledWith('inv-1', 'w-1');
    });
  });
});
