import { Module } from '@nestjs/common';
import { WishesService } from './wishes.service';
import { WishesController } from './wishes.controller';
import { MyWishesController } from './my-wishes.controller';

@Module({
  controllers: [WishesController, MyWishesController],
  providers: [WishesService],
  exports: [WishesService],
})
export class WishesModule {}
