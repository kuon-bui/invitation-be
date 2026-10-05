import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('presigned-url')
  async getPresignedUrl(@Body() dto: PresignedUrlDto) {
    return this.mediaService.generatePresignedUrl(dto);
  }
}
