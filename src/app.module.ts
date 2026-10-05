import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { TemplatesModule } from './modules/templates/templates.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, TemplatesModule],
})
export class AppModule {}


