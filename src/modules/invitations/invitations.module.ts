import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { MyInvitationsController } from './my-invitations.controller';
import { InvitationOwnerGuard } from './guards/invitation-owner.guard';

@Module({
  imports: [PrismaModule],
  controllers: [InvitationsController, MyInvitationsController],
  providers: [InvitationsService, InvitationOwnerGuard],
  exports: [InvitationsService, InvitationOwnerGuard],
})
export class InvitationsModule {}
