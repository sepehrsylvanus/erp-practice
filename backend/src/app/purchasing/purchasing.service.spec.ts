import { Test, TestingModule } from '@nestjs/testing';
import { PurchasingService } from './purchasing.service';

describe('PurchasingService', () => {
  let service: PurchasingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PurchasingService],
    }).compile();

    service = module.get<PurchasingService>(PurchasingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
