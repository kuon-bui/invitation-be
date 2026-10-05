import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { RsvpListener } from './listeners/rsvp-listener';
import { WishListener } from './listeners/wish-listener';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, RsvpListener, WishListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}
