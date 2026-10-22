process.env.JWT_SECRET = 'test-jwt-secret-key-12345';
process.env.SEPAY_WEBHOOK_API_KEY = 'test-sepay-api-key';
process.env.SEPAY_ACC = '0123456789';
process.env.SEPAY_BANK = 'MBBank';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { GuestsService } from '../src/modules/guests/guests.service';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { EventType, GuestSide, InvitationStatus, PaymentStatus, Role } from '@prisma/client';

describe('E2E Integration Suite (11-Step User Journey)', () => {
  let app: INestApplication;

  // In-memory data store
  let users: any[] = [];
  let templates: any[] = [
    {
      id: 'duyen-dang-01',
      name: 'Duyên Dáng 01',
      eventType: EventType.WEDDING,
      category: 'truyen-thong',
      badge: 'Phổ biến',
      styleDesc: 'Phong cách truyền thống sang trọng',
      thumbnailUrl: 'https://example.com/duyen-dang-01.jpg',
      isActive: true,
      order: 1,
      config: { primaryColor: '#d32f2f' },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
  let invitations: any[] = [];
  let guests: any[] = [];
  let rsvps: any[] = [];
  let wishes: any[] = [];
  let payments: any[] = [];
  let notificationConfigs: any[] = [];

  const mockPrismaService = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),

    user: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        if (where.email) {
          return users.find((u) => u.email === where.email) || null;
        }
        if (where.id) {
          return users.find((u) => u.id === where.id) || null;
        }
        return null;
      }),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const newUser = {
          id: randomUUID(),
          email: data.email,
          passwordHash: data.passwordHash,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber || null,
          avatarUrl: null,
          role: data.role || Role.USER,
          googleId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.push(newUser);
        return newUser;
      }),
    },

    template: {
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return templates.filter((t) => {
          if (where?.isActive !== undefined && t.isActive !== where.isActive) return false;
          if (where?.eventType && t.eventType !== where.eventType) return false;
          return true;
        });
      }),
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        return templates.find((t) => t.id === where.id) || null;
      }),
    },

    invitation: {
      findUnique: jest.fn().mockImplementation(async ({ where, include }) => {
        const inv = invitations.find((i) => {
          if (where.slug && i.slug === where.slug) return true;
          if (where.id && i.id === where.id) return true;
          return false;
        });
        if (!inv) return null;
        const result = { ...inv };
        if (include?.template) {
          result.template = templates.find((t) => t.id === inv.templateId) || null;
        }
        return result;
      }),
      findMany: jest.fn().mockImplementation(async ({ where, include }) => {
        return invitations
          .filter((i) => !where?.userId || i.userId === where.userId)
          .map((i) => {
            const item = { ...i };
            if (include?.template) {
              item.template = templates.find((t) => t.id === i.templateId) || null;
            }
            return item;
          });
      }),
      create: jest.fn().mockImplementation(async ({ data, include }) => {
        const newInv = {
          id: randomUUID(),
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        invitations.push(newInv);
        const result = { ...newInv };
        if (include?.template) {
          result.template = templates.find((t) => t.id === newInv.templateId) || null;
        }
        return result;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const inv = invitations.find((i) => i.id === where.id);
        if (!inv) return null;
        Object.assign(inv, data, { updatedAt: new Date() });
        return { ...inv };
      }),
      delete: jest.fn().mockImplementation(async ({ where }) => {
        const index = invitations.findIndex((i) => i.id === where.id);
        if (index === -1) return null;
        const [deleted] = invitations.splice(index, 1);
        return deleted;
      }),
    },

    guest: {
      findFirst: jest.fn().mockImplementation(async ({ where }) => {
        return (
          guests.find((g) => {
            if (where.weddingId && g.weddingId !== where.weddingId) return false;
            if (where.code && g.code !== where.code) return false;
            if (where.id && g.id !== where.id) return false;
            return true;
          }) || null
        );
      }),
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return guests.filter((g) => {
          if (where?.weddingId && g.weddingId !== where.weddingId) return false;
          if (where?.side && g.side !== where.side) return false;
          if (where?.hasViewed !== undefined && g.hasViewed !== where.hasViewed) return false;
          return true;
        });
      }),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const newGuest = {
          id: randomUUID(),
          weddingId: data.weddingId,
          name: data.name,
          side: data.side || GuestSide.CHUNG,
          phone: data.phone || null,
          code: data.code,
          hasViewed: false,
          viewedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        guests.push(newGuest);
        return { ...newGuest };
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const guest = guests.find((g) => g.id === where.id);
        if (!guest) return null;
        Object.assign(guest, data, { updatedAt: new Date() });
        return { ...guest };
      }),
      delete: jest.fn().mockImplementation(async ({ where }) => {
        const index = guests.findIndex((g) => g.id === where.id);
        if (index === -1) return null;
        const [deleted] = guests.splice(index, 1);
        return deleted;
      }),
    },

    rsvp: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const newRsvp = {
          id: randomUUID(),
          invitationId: data.invitationId,
          guestId: data.guestId || null,
          guestName: data.guestName,
          attending: data.attending,
          guestCount: data.guestCount ?? 1,
          diet: data.diet || null,
          note: data.note || null,
          createdAt: new Date(),
        };
        rsvps.push(newRsvp);
        return { ...newRsvp };
      }),
      findMany: jest.fn().mockImplementation(async ({ where }) => {
        return rsvps.filter((r) => !where?.invitationId || r.invitationId === where.invitationId);
      }),
    },

    wish: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const newWish = {
          id: randomUUID(),
          invitationId: data.invitationId,
          senderName: data.senderName,
          content: data.content,
          isApproved: data.isApproved ?? true,
          createdAt: new Date(),
        };
        wishes.push(newWish);
        return { ...newWish };
      }),
      findMany: jest.fn().mockImplementation(async ({ where, skip, take }) => {
        let filtered = wishes.filter((w) => {
          if (where?.invitationId && w.invitationId !== where.invitationId) return false;
          if (where?.isApproved !== undefined && w.isApproved !== where.isApproved) return false;
          return true;
        });
        if (skip) filtered = filtered.slice(skip);
        if (take) filtered = filtered.slice(0, take);
        return filtered;
      }),
      count: jest.fn().mockImplementation(async ({ where }) => {
        return wishes.filter((w) => {
          if (where?.invitationId && w.invitationId !== where.invitationId) return false;
          if (where?.isApproved !== undefined && w.isApproved !== where.isApproved) return false;
          return true;
        }).length;
      }),
    },

    payment: {
      create: jest.fn().mockImplementation(async ({ data }) => {
        const newPayment = {
          id: randomUUID(),
          userId: data.userId,
          invitationId: data.invitationId,
          amount: data.amount,
          transactionCode: data.transactionCode,
          status: data.status || PaymentStatus.PENDING,
          rawWebhook: null,
          paidAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        payments.push(newPayment);
        return { ...newPayment };
      }),
      findFirst: jest.fn().mockImplementation(async ({ where, include }) => {
        const payment = payments.find((p) => {
          if (where.transactionCode && p.transactionCode === where.transactionCode) return true;
          if (where.id && p.id === where.id) return true;
          return false;
        });
        if (!payment) return null;
        const result = { ...payment };
        if (include?.invitation) {
          result.invitation = invitations.find((i) => i.id === payment.invitationId) || null;
        }
        return result;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }) => {
        const payment = payments.find((p) => p.id === where.id);
        if (!payment) return null;
        Object.assign(payment, data, { updatedAt: new Date() });
        return { ...payment };
      }),
      updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
        const matched = payments.filter((p) =>
          Object.entries(where).every(([key, value]) => p[key] === value),
        );
        matched.forEach((p) => Object.assign(p, data, { updatedAt: new Date() }));
        return { count: matched.length };
      }),
      findUniqueOrThrow: jest.fn().mockImplementation(async ({ where }) => {
        const payment = payments.find((p) => p.id === where.id);
        if (!payment) throw new Error('Payment not found');
        return { ...payment };
      }),
    },

    notificationConfig: {
      findUnique: jest.fn().mockImplementation(async ({ where }) => {
        return notificationConfigs.find((c) => c.invitationId === where.invitationId) || null;
      }),
      upsert: jest.fn().mockImplementation(async ({ where, update, create }) => {
        let config = notificationConfigs.find((c) => c.invitationId === where.invitationId);
        if (config) {
          Object.assign(config, update);
        } else {
          config = { id: randomUUID(), ...create };
          notificationConfigs.push(config);
        }
        return { ...config };
      }),
    },
  };

  (mockPrismaService as any).$transaction = jest
    .fn()
    .mockImplementation(async (callback: (tx: any) => Promise<any>) => callback(mockPrismaService));

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-12345';
    process.env.SEPAY_WEBHOOK_API_KEY = 'test-sepay-api-key';
    process.env.SEPAY_ACC = '0123456789';
    process.env.SEPAY_BANK = 'MBBank';

    jest.spyOn(GuestsService.prototype, 'generateGuestCode').mockReturnValue('TUAN12');
    jest.spyOn(PaymentsService.prototype, 'generateTransactionCode').mockReturnValue('MDXYZ');

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // Flow State
  let accessToken: string;
  let invitationId: string;
  let guestCode: string;
  let guestId: string;
  let transactionCode: string;

  it('Step 1: POST /api/v1/auth/register -> Register account and receive accessToken', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'quan.dung@example.com',
        password: 'password123',
        fullName: 'Quân Dũng',
        phoneNumber: '0987654321',
      })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.email).toBe('quan.dung@example.com');
    expect(res.body.user.fullName).toBe('Quân Dũng');

    accessToken = res.body.accessToken;
  });

  it('Step 2: GET /api/v1/templates -> Browse templates and select duyen-dang-01', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/templates')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    const selectedTemplate = res.body.find((t: any) => t.id === 'duyen-dang-01');
    expect(selectedTemplate).toBeDefined();
    expect(selectedTemplate.name).toBe('Duyên Dáng 01');
  });

  it('Step 3: POST /api/v1/my-invitations -> Create invitation with slug "quan-dung" and TRIAL status', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/my-invitations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        templateId: 'duyen-dang-01',
        eventType: EventType.WEDDING,
        title: 'Đám cưới Quân & Dũng',
        slug: 'quan-dung',
        eventDate: '2026-12-31T18:00:00.000Z',
        startTime: '18:00',
        venueName: 'Trung tâm tiệc cưới White Palace',
        venueAddress: '194 Hoàng Văn Thụ, Phú Nhuận, TP.HCM',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.slug).toBe('quan-dung');
    expect(res.body.status).toBe(InvitationStatus.TRIAL);

    invitationId = res.body.id;
  });

  it('Step 4: POST /api/v1/my-invitations/:id/guests -> Add guest "Anh Tuấn" with code "TUAN12"', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/my-invitations/${invitationId}/guests`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Anh Tuấn',
        side: GuestSide.TRAI,
        phone: '0912345678',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Anh Tuấn');
    expect(res.body.code).toBe('TUAN12');
    expect(res.body.hasViewed).toBe(false);

    guestId = res.body.id;
    guestCode = res.body.code;
  });

  it('Step 5: GET /api/v1/invitations/slug/:slug/guest/:code -> Guest opens invitation, hasViewed becomes true', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/invitations/slug/quan-dung/guest/${guestCode}`)
      .expect(200);

    expect(res.body).toHaveProperty('invitation');
    expect(res.body).toHaveProperty('guest');
    expect(res.body.invitation.slug).toBe('quan-dung');
    expect(res.body.guest.name).toBe('Anh Tuấn');
    expect(res.body.guest.code).toBe('TUAN12');
    expect(res.body.guest.hasViewed).toBe(true);
  });

  it('Step 6: POST /api/v1/invitations/:id/rsvp -> Guest submits RSVP response', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/invitations/${invitationId}/rsvp`)
      .send({
        guestId,
        guestName: 'Anh Tuấn',
        attending: true,
        guestCount: 2,
        diet: 'chay',
        note: 'Chúc hai bạn trăm năm hạnh phúc!',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.invitationId).toBe(invitationId);
    expect(res.body.guestName).toBe('Anh Tuấn');
    expect(res.body.attending).toBe(true);
    expect(res.body.guestCount).toBe(2);
    expect(res.body.diet).toBe('chay');
  });

  it('Step 7: POST /api/v1/invitations/:id/wishes -> Guest posts wedding wish', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/invitations/${invitationId}/wishes`)
      .send({
        senderName: 'Anh Tuấn',
        content: 'Chúc hai bạn trăm năm hạnh phúc, sớm có quý tử!',
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.invitationId).toBe(invitationId);
    expect(res.body.senderName).toBe('Anh Tuấn');
    expect(res.body.content).toBe('Chúc hai bạn trăm năm hạnh phúc, sớm có quý tử!');
    expect(res.body.isApproved).toBe(true);
  });

  it('Step 8: POST /api/v1/payments/create-invoice -> Couple creates invoice, generates transactionCode "MDXYZ"', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/create-invoice')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        invitationId,
        amount: 1000,
      })
      .expect(201);

    expect(res.body).toHaveProperty('invoiceId');
    expect(res.body.transactionCode).toBe('MDXYZ');
    // The server sets the price; the client amount is ignored.
    expect(res.body.amount).toBe(199000);
    expect(res.body.status).toBe(PaymentStatus.PENDING);
    expect(res.body.qrUrl).toContain('MDXYZ');

    transactionCode = res.body.transactionCode;
  });

  it('Step 9: POST /api/v1/payments/webhook/sepay -> Webhook confirms payment, pushes SUCCESS to the open SSE stream and activates invitation', async () => {
    const findFirstCalls = mockPrismaService.payment.findFirst.mock.calls.length;
    // The stream request resolves only once the stream completes, i.e. after the webhook lands.
    const streamResponse = request(app.getHttpServer())
      .get(`/api/v1/payments/stream/${transactionCode}`)
      .buffer(true)
      .parse(collectText)
      .then((response) => response);
    // Pre-check + snapshot query done => the stream is subscribed to payment.success.
    await waitFor(() => mockPrismaService.payment.findFirst.mock.calls.length >= findFirstCalls + 2);

    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/webhook/sepay')
      .set('Authorization', 'Bearer test-sepay-api-key')
      .send({
        id: 123456,
        gateway: 'MBBank',
        transactionDate: '2026-10-05 14:30:00',
        accountNumber: '0123456789',
        code: transactionCode,
        content: `CK ${transactionCode}`,
        transferType: 'in',
        description: `Thanh toan kich hoat thiep ${transactionCode}`,
        transferAmount: 199000,
        referenceCode: 'FT12345678',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Payment processed and invitation activated');

    const stream = await streamResponse;
    expect(stream.status).toBe(200);
    expect(stream.headers['content-type']).toContain('text/event-stream');
    expect(parseSseData(stream.body).map((event) => event.status)).toEqual([
      PaymentStatus.PENDING,
      PaymentStatus.SUCCESS,
    ]);

    // Verify invitation is now ACTIVE
    const checkRes = await request(app.getHttpServer())
      .get(`/api/v1/my-invitations/${invitationId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(checkRes.body.status).toBe(InvitationStatus.ACTIVE);
  });

  it('Step 10: GET /api/v1/payments/stream/:transactionCode -> Stream opened after payment sends SUCCESS and closes', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/payments/stream/${transactionCode}`)
      .buffer(true)
      .parse(collectText)
      .expect(200);

    expect(res.headers['content-type']).toContain('text/event-stream');
    const events = parseSseData(res.body);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ transactionCode, status: PaymentStatus.SUCCESS, isPaid: true });
  });

  it('Step 11: GET /api/v1/payments/stream/:transactionCode -> Unknown transaction code returns 404', async () => {
    await request(app.getHttpServer()).get('/api/v1/payments/stream/MDUNKNOWN').expect(404);
  });
});

function collectText(res: any, callback: (err: Error | null, body: string) => void) {
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (chunk: string) => (body += chunk));
  res.on('end', () => callback(null, body));
}

function parseSseData(body: string): any[] {
  return body
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice('data: '.length)));
}

async function waitFor(condition: () => boolean, timeoutMs = 2000) {
  const startedAt = Date.now();
  while (!condition()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
