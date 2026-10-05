import { Module } from '@nestjs/common';
import { RsvpService } from './rsvp.service';
import { RsvpController } from './rsvp.controller';
import { MyRsvpController } from './my-rsvp.controller';

@Module({
  controllers: [RsvpController, MyRsvpController],
  providers: [RsvpService],
  exports: [RsvpService],
})
export class RsvpModule {}
