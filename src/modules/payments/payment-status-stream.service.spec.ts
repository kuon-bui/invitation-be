import { Test, TestingModule } from '@nestjs/testing';
import { MessageEvent, NotFoundException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PaymentStatusStreamService } from './payment-status-stream.service';
import { PaymentsService } from './payments.service';

describe('PaymentStatusStreamService', () => {
  let service: PaymentStatusStreamService;
  let paymentsService: { checkStatus: jest.Mock };

  const statusResponse = (status: 'PENDING' | 'SUCCESS', transactionCode = 'MDABC123') => ({
    invoiceId: 'pay-1',
    transactionCode,
    amount: 199000,
    status,
    isPaid: status === 'SUCCESS',
    paidAt: status === 'SUCCESS' ? new Date('2026-10-22T10:00:00Z') : null,
    invitationId: 'inv-1',
  });

  const paymentRow = (overrides: Record<string, any> = {}) =>
    ({
      id: 'pay-1',
      userId: 'user-1',
      invitationId: 'inv-1',
      amount: 199000,
      transactionCode: 'MDABC123',
      status: 'SUCCESS',
      rawWebhook: null,
      paidAt: new Date('2026-10-22T10:00:00Z'),
      createdAt: new Date('2026-10-22T09:55:00Z'),
      ...overrides,
    }) as any;

  const collect = (stream: Observable<MessageEvent>) => {
    const messages: MessageEvent[] = [];
    let completed = false;
    let settle!: { resolve: () => void; reject: (err: unknown) => void };
    const done = new Promise<void>((resolve, reject) => (settle = { resolve, reject }));
    const subscription = stream.subscribe({
      next: (message) => messages.push(message),
      error: (err) => settle.reject(err),
      complete: () => {
        completed = true;
        settle.resolve();
      },
    });
    return { messages, done, subscription, isCompleted: () => completed };
  };

  const flush = () => new Promise((resolve) => setImmediate(resolve));

  beforeEach(async () => {
    paymentsService = { checkStatus: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentStatusStreamService,
        { provide: PaymentsService, useValue: paymentsService },
      ],
    }).compile();

    service = module.get(PaymentStatusStreamService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects before streaming when the transaction code is unknown', async () => {
    paymentsService.checkStatus.mockRejectedValue(new NotFoundException());

    await expect(service.open('MDUNKNOWN')).rejects.toThrow(NotFoundException);
  });

  it('emits the paid snapshot once and completes when the payment is already paid', async () => {
    paymentsService.checkStatus.mockResolvedValue(statusResponse('SUCCESS'));

    const { messages, done } = collect(await service.open('MDABC123'));
    await done;

    expect(messages).toEqual([
      { data: expect.objectContaining({ status: 'SUCCESS', isPaid: true }), retry: 3000 },
    ]);
  });

  it('emits the pending snapshot, then pushes success when payment.success arrives', async () => {
    paymentsService.checkStatus.mockResolvedValue(statusResponse('PENDING'));

    const { messages, done, isCompleted } = collect(await service.open('MDABC123'));
    await flush();

    expect(messages).toEqual([{ data: expect.objectContaining({ status: 'PENDING' }), retry: 3000 }]);
    expect(isCompleted()).toBe(false);

    service.handlePaymentSuccess({ payment: paymentRow() });
    await done;

    expect(messages).toHaveLength(2);
    expect(messages[1]).toEqual({
      data: expect.objectContaining({ transactionCode: 'MDABC123', status: 'SUCCESS', isPaid: true }),
      retry: 3000,
    });
  });

  it('ignores payment.success for other transaction codes', async () => {
    paymentsService.checkStatus.mockResolvedValue(statusResponse('PENDING'));

    const { messages, isCompleted, subscription } = collect(await service.open('MDABC123'));
    await flush();
    service.handlePaymentSuccess({ payment: paymentRow({ transactionCode: 'MDOTHER' }) });
    await flush();

    expect(messages).toHaveLength(1);
    expect(isCompleted()).toBe(false);
    subscription.unsubscribe();
  });

  it('captures a payment.success that fires while the snapshot query is still in flight', async () => {
    let resolveSnapshot!: (value: unknown) => void;
    paymentsService.checkStatus
      .mockResolvedValueOnce(statusResponse('PENDING'))
      .mockReturnValueOnce(new Promise((resolve) => (resolveSnapshot = resolve)));

    const { messages, done } = collect(await service.open('MDABC123'));
    service.handlePaymentSuccess({ payment: paymentRow() });
    await done;
    resolveSnapshot(statusResponse('PENDING'));
    await flush();

    expect(messages).toEqual([
      { data: expect.objectContaining({ status: 'SUCCESS' }), retry: 3000 },
    ]);
  });

  it('sends a heartbeat comment every 25 seconds while pending', async () => {
    jest.useFakeTimers();
    paymentsService.checkStatus.mockResolvedValue(statusResponse('PENDING'));

    const { messages, subscription } = collect(await service.open('MDABC123'));
    await jest.advanceTimersByTimeAsync(25_000);

    expect(messages).toContainEqual({ comment: 'ping' });
    subscription.unsubscribe();
  });

  it('closes the stream after its maximum lifetime', async () => {
    jest.useFakeTimers();
    paymentsService.checkStatus.mockResolvedValue(statusResponse('PENDING'));

    const { isCompleted } = collect(await service.open('MDABC123'));
    await jest.advanceTimersByTimeAsync(16 * 60_000 - 1);
    expect(isCompleted()).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    expect(isCompleted()).toBe(true);
  });
});
