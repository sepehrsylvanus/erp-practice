import { Module } from '@nestjs/common';
import { PurchasingService } from './purchasing.service';

@Module({
  providers: [PurchasingService]
})
export class PurchasingModule {}
