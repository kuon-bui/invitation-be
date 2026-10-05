import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { GuestsModule } from './modules/guests/guests.module';

@Module({
  imports: [
    CacheModule.register({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    TemplatesModule,
    InvitationsModule,
    GuestsModule,
  ],
})
export class AppModule {}


