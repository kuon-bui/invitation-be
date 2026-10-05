import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RsvpService } from './rsvp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvitationOwnerGuard } from '../invitations/guards/invitation-owner.guard';

@Controller('api/v1/my-invitations/:id/rsvps')
@UseGuards(JwtAuthGuard, InvitationOwnerGuard)
export class MyRsvpController {
  constructor(private readonly rsvpService: RsvpService) {}

  @Get()
  async getRsvps(@Param('id') id: string) {
    return this.rsvpService.findAllByInvitation(id);
  }
}
