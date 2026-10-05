import { Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { WishesService } from './wishes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvitationOwnerGuard } from '../invitations/guards/invitation-owner.guard';

@Controller('api/v1/my-invitations/:id/wishes')
@UseGuards(JwtAuthGuard, InvitationOwnerGuard)
export class MyWishesController {
  constructor(private readonly wishesService: WishesService) {}

  @Patch(':wishId/toggle')
  async toggle(@Param('id') id: string, @Param('wishId') wishId: string) {
    return this.wishesService.toggleApproval(id, wishId);
  }
}
