import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  Post,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PaymentsService } from './payments.service';
import { PaymentStatusStreamService } from './payment-status-stream.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePublicInvoiceDto } from './dto/create-public-invoice.dto';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('api/v1/payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentStatusStream: PaymentStatusStreamService,
  ) {}

  @Post('create-invoice')
  @UseGuards(JwtAuthGuard)
  async createInvoice(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.paymentsService.createInvoice(userId, dto);
  }

  @Post('public-invoice')
  async createPublicInvoice(@Body() dto: CreatePublicInvoiceDto) {
    return this.paymentsService.createPublicInvoice(dto);
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

  @Sse('stream/:transactionCode')
  streamStatus(
    @Param('transactionCode') transactionCode: string,
  ): Promise<Observable<MessageEvent>> {
    return this.paymentStatusStream.open(transactionCode);
  }
}
