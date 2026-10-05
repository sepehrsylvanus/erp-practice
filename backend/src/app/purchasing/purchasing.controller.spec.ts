import { Test, TestingModule } from '@nestjs/testing';
import { PurchasingController } from './purchasing.controller';

describe('PurchasingController', () => {
  let controller: PurchasingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchasingController],
    }).compile();

    controller = module.get<PurchasingController>(PurchasingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
