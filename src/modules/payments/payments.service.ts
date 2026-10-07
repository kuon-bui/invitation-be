import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvitationStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreatePublicInvoiceDto } from './dto/create-public-invoice.dto';
import { SepayWebhookDto } from './dto/sepay-webhook.dto';

@Injectable()
export class PaymentsService {
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

    const transactionCode = this.generateTransactionCode();
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        invitationId: dto.invitationId,
        amount: dto.amount,
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

  async createPublicInvoice(dto: CreatePublicInvoiceDto) {
    let invitation: any = null;
    if (dto.invitationId) {
      invitation = await this.prisma.invitation.findUnique({
        where: { id: dto.invitationId },
      });
    } else if (dto.slug) {
      invitation = await this.prisma.invitation.findUnique({
        where: { slug: dto.slug },
      });
    }

    const transactionCode = this.generateTransactionCode();
    const amount = dto.amount || 199000;

    let invoiceId = '';
    if (invitation) {
      const payment = await this.prisma.payment.create({
        data: {
          userId: invitation.userId,
          invitationId: invitation.id,
          amount,
          transactionCode,
          status: PaymentStatus.PENDING,
        },
      });
      invoiceId = payment.id;
    }

    const acc = process.env.SEPAY_ACC || '';
    const bank = process.env.SEPAY_BANK || '';
    const name = process.env.SEPAY_NAME || '';
    const qrUrl = `https://qr.sepay.vn/img?acc=${acc}&bank=${bank}&amount=${amount}&des=${transactionCode}`;

    return {
      invoiceId,
      transactionCode,
      amount,
      status: PaymentStatus.PENDING,
      qrUrl,
      accountNumber: acc,
      bankName: bank,
      accountName: name,
    };
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

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        paidAt: new Date(),
        rawWebhook: dto as any,
      },
    });

    const updatedInvitation = await this.prisma.invitation.update({
      where: { id: payment.invitationId },
      data: {
        status: InvitationStatus.ACTIVE,
        activatedAt: new Date(),
        trialEndsAt: null,
      },
    });

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

  async checkStatus(transactionCode: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { transactionCode },
    });

    if (!payment) {
      throw new NotFoundException(
        `Payment not found for transaction code ${transactionCode}`,
      );
    }

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
}
