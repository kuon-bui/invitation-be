import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: Partial<PaymentsService>;

  beforeEach(async () => {
    service = {
      createInvoice: jest.fn(),
      handleSepayWebhook: jest.fn(),
      checkStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: service }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call createInvoice with user id and dto', async () => {
    const dto = { invitationId: 'inv-1', amount: 299000 };
    (service.createInvoice as jest.Mock).mockResolvedValue({
      invoiceId: 'pay-1',
      transactionCode: 'MD123',
      amount: 299000,
      status: 'PENDING',
      qrUrl: 'https://qr.sepay.vn/...',
    });

    const result = await controller.createInvoice('user-1', dto);
    expect(service.createInvoice).toHaveBeenCalledWith('user-1', dto);
    expect(result.invoiceId).toBe('pay-1');
  });

  it('should call handleSepayWebhook with payload and auth headers', async () => {
    const dto = { content: 'MD123', transferAmount: 299000 };
    (service.handleSepayWebhook as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Payment processed and invitation activated',
    });

    const result = await controller.handleSepayWebhook(
      dto,
      'Apikey test-key',
      undefined,
    );
    expect(service.handleSepayWebhook).toHaveBeenCalledWith(dto, 'Apikey test-key');
    expect(result.success).toBe(true);
  });

  it('should call handleSepayWebhook with x-api-key when authorization header is absent', async () => {
    const dto = { content: 'MD123', transferAmount: 299000 };
    (service.handleSepayWebhook as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Payment processed and invitation activated',
    });

    const result = await controller.handleSepayWebhook(
      dto,
      undefined,
      'x-api-key-value',
    );
    expect(service.handleSepayWebhook).toHaveBeenCalledWith(dto, 'x-api-key-value');
    expect(result.success).toBe(true);
  });

  it('should call checkStatus with transaction code', async () => {
    (service.checkStatus as jest.Mock).mockResolvedValue({
      invoiceId: 'pay-1',
      transactionCode: 'MD123',
      amount: 299000,
      status: 'PENDING',
    });

    const result = await controller.checkStatus('MD123');
    expect(service.checkStatus).toHaveBeenCalledWith('MD123');
    expect(result.status).toBe('PENDING');
  });
});
