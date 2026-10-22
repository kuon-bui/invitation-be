import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let cache: any;
  let eventEmitter: Partial<EventEmitter2>;

  const pendingPayment = (overrides: Record<string, any> = {}) => ({
    id: 'pay-1',
    transactionCode: 'MDABC123',
    status: 'PENDING',
    amount: 199000,
    invitationId: 'inv-1',
    invitation: { id: 'inv-1', slug: 'quan-dung', status: 'TRIAL' },
    ...overrides,
  });

  const mockSuccessfulActivation = (payment: Record<string, any>) => {
    prisma.payment.findFirst.mockResolvedValue(payment);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.payment.findUniqueOrThrow.mockResolvedValue({ ...payment, status: 'SUCCESS' });
    prisma.invitation.update.mockResolvedValue({ id: 'inv-1', status: 'ACTIVE' });
  };

  beforeEach(async () => {
    process.env.SEPAY_WEBHOOK_API_KEY = 'valid-api-key';
    delete process.env.PAYMENT_LIFETIME_PRICE;
    cache = { del: jest.fn() };
    eventEmitter = { emit: jest.fn() };
    prisma = {
      payment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      invitation: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    prisma.$transaction = jest.fn((cb: (tx: any) => any) => cb(prisma));

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
    mockSuccessfulActivation(pendingPayment());

    const result = await service.handleSepayWebhook(
      {
        content: 'Chuyen khoan MDABC123 mung cuoi',
        transferType: 'in',
        transferAmount: 199000,
        referenceCode: 'REF123',
      },
      'Apikey valid-api-key',
    );

    expect(result.success).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pay-1', status: 'PENDING' },
        data: expect.objectContaining({ status: 'SUCCESS' }),
      }),
    );
    expect(prisma.invitation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }),
    );
    expect(cache.del).toHaveBeenCalledWith('invitation:slug:quan-dung');
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'payment.success',
      expect.objectContaining({
        payment: expect.objectContaining({ transactionCode: 'MDABC123', status: 'SUCCESS' }),
      }),
    );
  });

  it('should ignore duplicate webhook payloads gracefully (idempotency)', async () => {
    prisma.payment.findFirst.mockResolvedValue(pendingPayment({ status: 'SUCCESS' }));

    const result = await service.handleSepayWebhook(
      { content: 'MDABC123', transferAmount: 199000 },
      'Apikey valid-api-key',
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain('Already processed');
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('should not activate twice when a concurrent webhook already claimed the payment', async () => {
    prisma.payment.findFirst.mockResolvedValue(pendingPayment());
    prisma.payment.updateMany.mockResolvedValue({ count: 0 });

    const result = await service.handleSepayWebhook(
      { content: 'MDABC123', transferType: 'in', transferAmount: 199000 },
      'Apikey valid-api-key',
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain('Already processed');
    expect(prisma.invitation.update).not.toHaveBeenCalled();
    expect(cache.del).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should ignore a transfer smaller than the payment amount', async () => {
    prisma.payment.findFirst.mockResolvedValue(pendingPayment());

    const result = await service.handleSepayWebhook(
      { content: 'MDABC123', transferType: 'in', transferAmount: 1000 },
      'Apikey valid-api-key',
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe('Ignored: insufficient amount');
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.invitation.update).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should ignore a webhook without transferAmount', async () => {
    prisma.payment.findFirst.mockResolvedValue(pendingPayment());

    const result = await service.handleSepayWebhook(
      { content: 'MDABC123', transferType: 'in' },
      'Apikey valid-api-key',
    );

    expect(result.message).toBe('Ignored: insufficient amount');
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
  });

  it('should ignore an outgoing transfer', async () => {
    prisma.payment.findFirst.mockResolvedValue(pendingPayment());

    const result = await service.handleSepayWebhook(
      { content: 'MDABC123', transferType: 'out', transferAmount: 199000 },
      'Apikey valid-api-key',
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe('Ignored: not an incoming transfer');
    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException on invalid api key', async () => {
    await expect(
      service.handleSepayWebhook({ content: 'MDABC123' }, 'wrong-key'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should process webhook when code property is provided directly', async () => {
    mockSuccessfulActivation(
      pendingPayment({
        transactionCode: 'MDCODE999',
        invitation: { id: 'inv-1', slug: 'wedding-slug', status: 'TRIAL' },
      }),
    );

    const result = await service.handleSepayWebhook(
      { code: 'MDCODE999', transferAmount: 199000 },
      'Apikey valid-api-key',
    );

    expect(result.success).toBe(true);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SUCCESS' }) }),
    );
  });

  it('should throw NotFoundException when no transaction code can be extracted', async () => {
    await expect(
      service.handleSepayWebhook({ content: 'no code here' }, 'Apikey valid-api-key'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException when payment is not found in database', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);

    await expect(
      service.handleSepayWebhook({ content: 'MDNOTFOUND123' }, 'Apikey valid-api-key'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create an invoice priced by the server, ignoring the client amount', async () => {
    const mockInvitation = { id: 'inv-1', userId: 'user-1' };
    prisma.invitation.findUnique.mockResolvedValue(mockInvitation);
    prisma.payment.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'pay-new',
        ...data,
      }),
    );

    const result = await service.createInvoice('user-1', {
      invitationId: 'inv-1',
      amount: 1000,
    });

    expect(result.invoiceId).toBe('pay-new');
    expect(result.amount).toBe(199000);
    expect(result.status).toBe('PENDING');
    expect(result.transactionCode).toMatch(/^MD[A-Z0-9]+$/);
    expect(result.qrUrl).toContain('amount=199000');
    expect(result.qrUrl).toContain(`des=${result.transactionCode}`);
  });

  it('should read the lifetime price from PAYMENT_LIFETIME_PRICE', async () => {
    process.env.PAYMENT_LIFETIME_PRICE = '249000';
    prisma.invitation.findUnique.mockResolvedValue({ id: 'inv-1', userId: 'user-1' });
    prisma.payment.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'pay-new', ...data }),
    );

    const result = await service.createPublicInvoice({ slug: 'quan-dung' });

    expect(result.amount).toBe(249000);
    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amount: 249000 }) }),
    );
  });

  it('should throw NotFoundException when creating invoice for non-existent invitation', async () => {
    prisma.invitation.findUnique.mockResolvedValue(null);

    await expect(
      service.createInvoice('user-1', {
        invitationId: 'inv-missing',
        amount: 199000,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create a public invoice with a payment record for an existing slug', async () => {
    prisma.invitation.findUnique.mockResolvedValue({ id: 'inv-1', userId: 'user-1' });
    prisma.payment.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'pay-pub', ...data }),
    );

    const result = await service.createPublicInvoice({ slug: 'quan-dung', amount: 1000 });

    expect(result.invoiceId).toBe('pay-pub');
    expect(result.amount).toBe(199000);
    expect(result.qrUrl).toContain(`des=${result.transactionCode}`);
  });

  it('should refuse a public invoice when the invitation does not exist', async () => {
    prisma.invitation.findUnique.mockResolvedValue(null);

    await expect(service.createPublicInvoice({ slug: 'missing-slug' })).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('should refuse a public invoice without invitationId or slug', async () => {
    await expect(service.createPublicInvoice({})).rejects.toThrow(BadRequestException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('should check status of a transaction', async () => {
    const mockPayment = {
      id: 'pay-1',
      transactionCode: 'MD123',
      status: 'PENDING',
      amount: 199000,
      paidAt: null,
      invitationId: 'inv-1',
    };
    prisma.payment.findFirst.mockResolvedValue(mockPayment);

    const result = await service.checkStatus('MD123');
    expect(result.status).toBe('PENDING');
    expect(result.transactionCode).toBe('MD123');
  });

  it('should throw NotFoundException when checking status of unknown transaction', async () => {
    prisma.payment.findFirst.mockResolvedValue(null);

    await expect(service.checkStatus('UNKNOWN')).rejects.toThrow(NotFoundException);
  });
});
