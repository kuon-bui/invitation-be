import { Controller, Get, Param } from '@nestjs/common';
import { InvitationsService } from './invitations.service';

@Controller('api/v1/invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.invitationsService.findBySlug(slug);
  }
}
