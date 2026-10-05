import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { QueryGuestDto } from './dto/query-guest.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvitationOwnerGuard } from '../invitations/guards/invitation-owner.guard';

@Controller('api/v1/my-invitations/:id/guests')
@UseGuards(JwtAuthGuard, InvitationOwnerGuard)
export class GuestsController {
  constructor(private readonly guestsService: GuestsService) {}

  @Get()
  async findAll(@Param('id') id: string, @Query() query: QueryGuestDto) {
    return this.guestsService.findAll(id, query);
  }

  @Post()
  async create(@Param('id') id: string, @Body() dto: CreateGuestDto) {
    return this.guestsService.create(id, dto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importGuests(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body() body?: { buffer?: string },
  ) {
    let buffer: Buffer | undefined;
    if (file?.buffer) {
      buffer = file.buffer;
    } else if (body?.buffer) {
      buffer = Buffer.from(body.buffer, 'base64');
    }

    if (!buffer) {
      throw new BadRequestException('Excel file is required');
    }

    return this.guestsService.importFromExcel(id, buffer);
  }

  @Get('export')
  async exportGuests(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.guestsService.exportToExcel(id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="guests.xlsx"');
    res.end(buffer);
  }

  @Delete(':guestId')
  async remove(@Param('id') id: string, @Param('guestId') guestId: string) {
    return this.guestsService.remove(id, guestId);
  }
}
