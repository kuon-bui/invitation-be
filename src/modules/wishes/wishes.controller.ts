import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WishesService } from './wishes.service';
import { CreateWishDto } from './dto/create-wish.dto';
import { QueryWishDto } from './dto/query-wish.dto';

@Controller('api/v1/invitations/:id/wishes')
export class WishesController {
  constructor(private readonly wishesService: WishesService) {}

  @Post()
  async create(@Param('id') id: string, @Body() dto: CreateWishDto) {
    return this.wishesService.create(id, dto);
  }

  @Get()
  async findAll(@Param('id') id: string, @Query() query: QueryWishDto) {
    return this.wishesService.findApprovedByInvitation(id, query);
  }
}
