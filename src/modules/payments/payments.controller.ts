import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-invoice')
  @UseGuards(JwtAuthGuard)
  async createInvoice(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.paymentsService.createInvoice(userId, dto);
  }

  @Post('webhook/sepay')
  @HttpCode(HttpStatus.OK)
  async handleSepayWebhook(
    @Body() dto: SepayWebhookDto,
    @Headers('authorization') authHeader?: string,
    @Headers('x-api-key') xApiKey?: string,
  ) {
    return this.paymentsService.handleSepayWebhook(dto, authHeader || xApiKey);
  }

  @Get('check-status/:transactionCode')
  async checkStatus(@Param('transactionCode') transactionCode: string) {
    return this.paymentsService.checkStatus(transactionCode);
  }
}
