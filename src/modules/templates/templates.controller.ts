import { Controller, Get, Param, Query } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { EventType } from '@prisma/client';

@Controller('api/v1/templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  async findAll(@Query('eventType') eventType?: EventType) {
    return this.templatesService.findAllActive(eventType);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }
}
