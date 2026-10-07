import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Controller('api/v1/invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.invitationsService.findBySlug(slug);
  }

  @Post('trial')
  async createTrial(@Body() dto: CreateInvitationDto) {
    return this.invitationsService.createTrial(dto);
  }

  @Post()
  async createPublic(@Body() dto: CreateInvitationDto) {
    return this.invitationsService.createTrial(dto);
  }
}
