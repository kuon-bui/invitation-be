import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateInvitationDto } from './dto/update-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvitationOwnerGuard } from './guards/invitation-owner.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/v1/my-invitations')
@UseGuards(JwtAuthGuard)
export class MyInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.invitationsService.findAllByUser(userId);
  }

  @Get(':id')
  @UseGuards(InvitationOwnerGuard)
  async findOne(@Param('id') id: string) {
    return this.invitationsService.findOne(id);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(userId, dto);
  }

  @Put(':id')
  @UseGuards(InvitationOwnerGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateInvitationDto) {
    return this.invitationsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(InvitationOwnerGuard)
  async remove(@Param('id') id: string) {
    return this.invitationsService.remove(id);
  }
}
