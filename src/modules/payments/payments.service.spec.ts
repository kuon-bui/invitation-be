import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: Partial<PrismaService>;
  let cache: any;
  let eventEmitter: Partial<EventEmitter2>;

  beforeEach(async () => {
    process.env.SEPAY_WEBHOOK_API_KEY = 'valid-api-key';
    cache = { del: jest.fn() };
    eventEmitter = { emit: jest.fn() };
    prisma = {
      payment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      } as any,
      invitation: {
        findUnique: jest.fn(),
        update: jest.fn(),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should process webhook and activate invitation when code matches', async () => {
    const mockPayment = {
      id: 'pay-1',
      transactionCode: 'MDABC123',
      status: 'PENDING',
      invitationId: 'inv-1',
      invitation: { id: 'inv-1', slug: 'quan-dung', status: 'TRIAL' },
    };
    (prisma.payment!.findFirst as jest.Mock).mockResolvedValue(mockPayment);
    (prisma.payment!.update as jest.Mock).mockResolvedValue({ ...mockPayment, status: 'SUCCESS' });
    (prisma.invitation!.update as jest.Mock).mockResolvedValue({ id: 'inv-1', status: 'ACTIVE' });

    const result = await service.handleSepayWebhook(
      { content: 'Chuyen khoan MDABC123 mung cuoi', transferAmount: 299000, referenceCode: 'REF123' },
      'Apikey valid-api-key',
    );

    expect(result.success).toBe(true);
    expect(prisma.payment!.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SUCCESS' }) }),
    );
    expect(prisma.invitation!.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }),
    );
    expect(cache.del).toHaveBeenCalledWith('invitation:slug:quan-dung');
    expect(eventEmitter.emit).toHaveBeenCalledWith('payment.success', expect.any(Object));
  });

  it('should ignore duplicate webhook payloads gracefully (idempotency)', async () => {
    const mockPayment = {
      id: 'pay-1',
      transactionCode: 'MDABC123',
      status: 'SUCCESS',
      invitationId: 'inv-1',
      invitation: { id: 'inv-1', slug: 'quan-dung' },
    };
    (prisma.payment!.findFirst as jest.Mock).mockResolvedValue(mockPayment);

    const result = await service.handleSepayWebhook(
      { content: 'MDABC123', transferAmount: 299000 },
      'Apikey valid-api-key',
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain('Already processed');
    expect(prisma.payment!.update).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException on invalid api key', async () => {
    await expect(
      service.handleSepayWebhook({ content: 'MDABC123' }, 'wrong-key'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should process webhook when code property is provided directly', async () => {
    const mockPayment = {
      id: 'pay-1',
      transactionCode: 'MDCODE999',
      status: 'PENDING',
      invitationId: 'inv-1',
      invitation: { id: 'inv-1', slug: 'wedding-slug', status: 'TRIAL' },
    };
    (prisma.payment!.findFirst as jest.Mock).mockResolvedValue(mockPayment);
    (prisma.payment!.update as jest.Mock).mockResolvedValue({ ...mockPayment, status: 'SUCCESS' });
    (prisma.invitation!.update as jest.Mock).mockResolvedValue({ id: 'inv-1', status: 'ACTIVE' });

    const result = await service.handleSepayWebhook(
      { code: 'MDCODE999', transferAmount: 299000 },
      'Apikey valid-api-key',
    );

    expect(result.success).toBe(true);
    expect(prisma.payment!.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SUCCESS' }) }),
    );
  });

  it('should throw NotFoundException when no transaction code can be extracted', async () => {
    await expect(
      service.handleSepayWebhook({ content: 'no code here' }, 'Apikey valid-api-key'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when payment is not found in database', async () => {
    (prisma.payment!.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.handleSepayWebhook({ content: 'MDNOTFOUND123' }, 'Apikey valid-api-key'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create an invoice with generated transaction code and QR url', async () => {
    const mockInvitation = { id: 'inv-1', userId: 'user-1' };
    (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue(mockInvitation);
    (prisma.payment!.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'pay-new',
        ...data,
      }),
    );

    const result = await service.createInvoice('user-1', {
      invitationId: 'inv-1',
      amount: 299000,
    });

    expect(result.invoiceId).toBe('pay-new');
    expect(result.amount).toBe(299000);
    expect(result.status).toBe('PENDING');
    expect(result.transactionCode).toMatch(/^MD[A-Z0-9]+$/);
    expect(result.qrUrl).toContain('amount=299000');
    expect(result.qrUrl).toContain(`des=${result.transactionCode}`);
  });

  it('should throw NotFoundException when creating invoice for non-existent invitation', async () => {
    (prisma.invitation!.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.createInvoice('user-1', {
        invitationId: 'inv-missing',
        amount: 299000,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should check status of a transaction', async () => {
    const mockPayment = {
      id: 'pay-1',
      transactionCode: 'MD123',
      status: 'PENDING',
      amount: 299000,
      paidAt: null,
      invitationId: 'inv-1',
    };
    (prisma.payment!.findFirst as jest.Mock).mockResolvedValue(mockPayment);

    const result = await service.checkStatus('MD123');
    expect(result.status).toBe('PENDING');
    expect(result.transactionCode).toBe('MD123');
  });

  it('should throw NotFoundException when checking status of unknown transaction', async () => {
    (prisma.payment!.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.checkStatus('UNKNOWN')).rejects.toThrow(NotFoundException);
  });
});
