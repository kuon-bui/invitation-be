import { Controller, Get, Param } from '@nestjs/common';
import { GuestsService } from './guests.service';

@Controller('api/v1/invitations')
export class PublicGuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Get('slug/:slug/guest/:code')
  async findBySlugAndCode(
    @Param('slug') slug: string,
    @Param('code') code: string,
  ) {
    return this.guestsService.findBySlugAndCode(slug, code);
  }
}
