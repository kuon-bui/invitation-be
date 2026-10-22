import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationStatus, Payment, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePublicInvoiceDto } from './dto/create-public-invoice.dto';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';

const DEFAULT_LIFETIME_PRICE = 199000;

export function toPaymentStatus(payment: Payment) {
  return {
    invoiceId: payment.id,
    transactionCode: payment.transactionCode,
    amount: payment.amount,
    status: payment.status,
    isPaid: payment.status === PaymentStatus.SUCCESS,
    paidAt: payment.paidAt,
    invitationId: payment.invitationId,
  };
}

export type PaymentStatusResponse = ReturnType<typeof toPaymentStatus>;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  generateTransactionCode(): string {
    const timestampPart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `MD${timestampPart}${randomPart}`;
  }

  async createInvoice(userId: string, dto: CreateInvoiceDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: dto.invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return this.issueInvoice(userId, invitation.id);
  }

  async createPublicInvoice(dto: CreatePublicInvoiceDto) {
    if (!dto.invitationId && !dto.slug) {
      throw new BadRequestException('invitationId or slug is required');
    }

    const invitation = dto.invitationId
      ? await this.prisma.invitation.findUnique({ where: { id: dto.invitationId } })
      : await this.prisma.invitation.findUnique({ where: { slug: dto.slug } });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    return this.issueInvoice(invitation.userId, invitation.id);
  }

  async handleSepayWebhook(dto: SepayWebhookDto, authHeader?: string) {
    const expectedKey = process.env.SEPAY_WEBHOOK_API_KEY;
    if (!expectedKey) {
      throw new UnauthorizedException('Webhook API key not configured');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    let token = authHeader.trim();
    if (/^apikey\s+/i.test(token)) {
      token = token.replace(/^apikey\s+/i, '').trim();
    } else if (/^bearer\s+/i.test(token)) {
      token = token.replace(/^bearer\s+/i, '').trim();
    }

    if (token !== expectedKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Outgoing transfers never pay an invoice; acknowledge so SePay does not retry.
    if (dto.transferType && dto.transferType !== 'in') {
      return { success: true, message: 'Ignored: not an incoming transfer' };
    }

    let transactionCode: string | null = null;
    if (dto.code && /^MD[A-Z0-9]+/i.test(dto.code)) {
      const match = dto.code.match(/MD[A-Z0-9]+/i);
      if (match) {
        transactionCode = match[0].toUpperCase();
      }
    }
    if (!transactionCode && dto.content) {
      const match = dto.content.match(/MD[A-Z0-9]+/i);
      if (match) {
        transactionCode = match[0].toUpperCase();
      }
    }

    if (!transactionCode) {
      throw new NotFoundException('Transaction code not found in webhook payload');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { transactionCode },
      include: { invitation: true },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment not found for transaction code ${transactionCode}`,
      );
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      return { success: true, message: 'Already processed' };
    }

    const transferAmount = dto.transferAmount ?? 0;
    if (transferAmount < payment.amount) {
      this.logger.warn(
        `Insufficient transfer for ${transactionCode}: received ${transferAmount}, expected ${payment.amount}`,
      );
      return { success: true, message: 'Ignored: insufficient amount' };
    }

    // The conditional update claims the payment, so concurrent duplicate webhooks activate it only once.
    const activated = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.SUCCESS,
          paidAt: new Date(),
          rawWebhook: dto as any,
        },
      });
      if (count === 0) {
        return null;
      }

      const updatedPayment = await tx.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });
      const updatedInvitation = await tx.invitation.update({
        where: { id: payment.invitationId },
        data: {
          status: InvitationStatus.ACTIVE,
          activatedAt: new Date(),
          trialEndsAt: null,
        },
      });
      return { updatedPayment, updatedInvitation };
    });

    if (!activated) {
      return { success: true, message: 'Already processed' };
    }

    const { updatedPayment, updatedInvitation } = activated;
    const slug = payment.invitation?.slug || updatedInvitation.slug;
    if (slug) {
      await this.cacheManager.del(`invitation:slug:${slug}`);
    }

    this.eventEmitter.emit('payment.success', {
      payment: updatedPayment,
      invitation: updatedInvitation,
    });

    return {
      success: true,
      message: 'Payment processed and invitation activated',
    };
  }

  async checkStatus(transactionCode: string): Promise<PaymentStatusResponse> {
    const payment = await this.prisma.payment.findFirst({
      where: { transactionCode },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment not found for transaction code ${transactionCode}`,
      );
    }

    return toPaymentStatus(payment);
  }

  private lifetimePrice(): number {
    const price = Number(process.env.PAYMENT_LIFETIME_PRICE);
    return Number.isInteger(price) && price > 0 ? price : DEFAULT_LIFETIME_PRICE;
  }

  private async issueInvoice(userId: string, invitationId: string) {
    const transactionCode = this.generateTransactionCode();
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        invitationId,
        amount: this.lifetimePrice(),
        transactionCode,
        status: PaymentStatus.PENDING,
      },
    });

    const acc = process.env.SEPAY_ACC || '';
    const bank = process.env.SEPAY_BANK || '';
    const name = process.env.SEPAY_NAME || '';
    const qrUrl = `https://qr.sepay.vn/img?acc=${acc}&bank=${bank}&amount=${payment.amount}&des=${transactionCode}`;

    return {
      invoiceId: payment.id,
      transactionCode: payment.transactionCode,
      amount: payment.amount,
      status: payment.status,
      qrUrl,
      accountNumber: acc,
      bankName: bank,
      accountName: name,
    };
  }
}
