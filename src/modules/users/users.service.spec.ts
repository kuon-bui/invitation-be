import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should find user by email', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.findByEmail('test@example.com');
    expect(result).toEqual(mockUser);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
  });

  it('should find user by id', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    prisma.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.findById('1');
    expect(result).toEqual(mockUser);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  it('should create user', async () => {
    const data = { email: 'test@example.com', fullName: 'Test' };
    prisma.user.create.mockResolvedValue({ id: '1', ...data });

    const result = await service.create(data as any);
    expect(result).toEqual({ id: '1', ...data });
    expect(prisma.user.create).toHaveBeenCalledWith({ data });
  });
});
