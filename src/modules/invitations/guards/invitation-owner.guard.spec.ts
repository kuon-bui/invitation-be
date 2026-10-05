import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvitationOwnerGuard } from './invitation-owner.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '@prisma/client';

describe('InvitationOwnerGuard', () => {
  let guard: InvitationOwnerGuard;
  let prisma: Partial<PrismaService>;

  beforeEach(() => {
    prisma = {
      invitation: {
        findUnique: jest.fn(),
      } as any,
    };
    guard = new InvitationOwnerGuard(prisma as PrismaService);
  });

  const createMockContext = (params: any, user?: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          params,
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if user is the owner of the invitation', async () => {
    (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      userId: 'user-1',
    });
    const context = createMockContext({ id: 'inv-1' }, { id: 'user-1', role: Role.USER });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should allow access if user is ADMIN even if not the owner', async () => {
    (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      userId: 'user-1',
    });
    const context = createMockContext({ id: 'inv-1' }, { id: 'admin-user', role: Role.ADMIN });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('should throw ForbiddenException if user is not the owner and not ADMIN', async () => {
    (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      userId: 'user-1',
    });
    const context = createMockContext({ id: 'inv-1' }, { id: 'other-user', role: Role.USER });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw NotFoundException if invitation is not found', async () => {
    (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue(null);
    const context = createMockContext({ id: 'inv-missing' }, { id: 'user-1', role: Role.USER });

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException if no user is present in request', async () => {
    const context = createMockContext({ id: 'inv-1' }, undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
