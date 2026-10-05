import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { GuestsService } from './guests.service';
import { GuestsController } from './guests.controller';
import { PublicGuestsController } from './public-guests.controller';

@Module({
  imports: [PrismaModule, InvitationsModule],
  controllers: [PublicGuestsController, GuestsController],
  providers: [GuestsService],
  exports: [GuestsService],
})
export class GuestsModule {}
