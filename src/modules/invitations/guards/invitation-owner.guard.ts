import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class InvitationOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const invitationId = request.params?.id;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException(`Invitation with ID "${invitationId}" not found`);
    }

    if (invitation.userId !== user.id) {
      throw new ForbiddenException('You do not have permission to access this invitation');
    }

    request.invitation = invitation;
    return true;
  }
}
