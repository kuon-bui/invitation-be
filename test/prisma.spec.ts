import { Test } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined and connectable', () => {
    expect(service).toBeDefined();
    expect(typeof service.$connect).toBe('function');
  });
});
