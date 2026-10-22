import { Injectable, MessageEvent } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Payment, PaymentStatus } from '@prisma/client';
import {
  Observable,
  Subject,
  defer,
  filter,
  interval,
  map,
  merge,
  takeUntil,
  takeWhile,
  timer,
} from 'rxjs';
import { PaymentStatusResponse, PaymentsService, toPaymentStatus } from './payments.service';

// Cloudflare drops proxied connections that stay silent for ~100s.
const HEARTBEAT_MS = 25_000;
// FE countdown is 15 minutes; leave a little slack before closing abandoned streams.
const MAX_STREAM_MS = 16 * 60_000;
const RETRY_MS = 3_000;

@Injectable()
export class PaymentStatusStreamService {
  // One shared listener fans out to every open stream, instead of one EventEmitter2
  // listener per connection (which would trip its maxListeners warning).
  private readonly paid$ = new Subject<Payment>();

  constructor(private readonly paymentsService: PaymentsService) {}

  @OnEvent('payment.success')
  handlePaymentSuccess(payload: { payment: Payment }) {
    this.paid$.next(payload.payment);
  }

  async open(transactionCode: string): Promise<Observable<MessageEvent>> {
    // Throws NotFoundException while the response can still be a plain 404.
    await this.paymentsService.checkStatus(transactionCode);

    // paid$ is subscribed before the snapshot query runs, so a webhook landing in between is not lost.
    return merge(
      this.paid$.pipe(
        filter((payment) => payment.transactionCode === transactionCode),
        map(toPaymentStatus),
      ),
      defer(() => this.paymentsService.checkStatus(transactionCode)),
      interval(HEARTBEAT_MS).pipe(map(() => null)),
    ).pipe(
      takeWhile(
        (status: PaymentStatusResponse | null) =>
          status === null || status.status === PaymentStatus.PENDING,
        true,
      ),
      map((status): MessageEvent =>
        status === null ? { comment: 'ping' } : { data: status, retry: RETRY_MS },
      ),
      takeUntil(timer(MAX_STREAM_MS)),
    );
  }
}
