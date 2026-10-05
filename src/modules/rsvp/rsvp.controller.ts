import { Body, Controller, Param, Post } from '@nestjs/common';
import { RsvpService } from './rsvp.service';
import { CreateRsvpDto } from './dto/create-rsvp.dto';

@Controller('api/v1/invitations')
export class RsvpController {
  constructor(private readonly rsvpService: RsvpService) {}

  @Post(':id/rsvp')
  async create(@Param('id') id: string, @Body() dto: CreateRsvpDto) {
    return this.rsvpService.create(id, dto);
  }
}
