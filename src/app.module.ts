import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { GuestsModule } from './modules/guests/guests.module';
import { RsvpModule } from './modules/rsvp/rsvp.module';
import { WishesModule } from './modules/wishes/wishes.module';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    CacheModule.register({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    UsersModule,
    AuthModule,
    TemplatesModule,
    InvitationsModule,
    GuestsModule,
    RsvpModule,
    WishesModule,
    MediaModule,
  ],
})
export class AppModule {}


