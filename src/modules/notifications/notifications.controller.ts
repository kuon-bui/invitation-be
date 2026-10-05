import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { BindTelegramDto } from './dto/bind-telegram.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvitationOwnerGuard } from '../invitations/guards/invitation-owner.guard';

@Controller('api/v1/my-invitations/:id/notifications')
@UseGuards(JwtAuthGuard, InvitationOwnerGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('telegram')
  async bindTelegram(
    @Param('id') id: string,
    @Body() dto: BindTelegramDto,
  ) {
    return this.notificationsService.upsertConfig(id, dto);
  }

  @Get('telegram')
  async getTelegramConfig(@Param('id') id: string) {
    return this.notificationsService.getConfig(id);
  }

  @Get()
  async getConfig(@Param('id') id: string) {
    return this.notificationsService.getConfig(id);
  }
}
