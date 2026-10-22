import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentStatusStreamService } from './payment-status-stream.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentStatusStreamService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
