import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Validate,
  ValidateNested,
} from "class-validator";

const MONEY = /^\d{1,15}(\.\d{1,2})?$/;
const QUANTITY = /^\d{1,15}(\.\d{1,3})?$/;
const RATE = /^\d{1,2}(\.\d{1,2})?$/;

export class PurchaseOrderLineDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @Matches(QUANTITY)
  quantity!: string;

  @Matches(MONEY)
  unitCost!: string;

  @IsOptional()
  @Matches(RATE)
  taxRate?: string;
}

export class CreatePurchaseOrderDto {
  @IsString()
  supplierId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  warehouseId!: string;

  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines!: PurchaseOrderLineDto[];
}

export class ReceivePurchaseLineDto {
  @IsString()
  purchaseOrderLineId!: string;

  @Matches(QUANTITY)
  quantity!: string;

  @IsOptional()
  @Matches(MONEY)
  unitCost?: string;
}

export class ReceivePurchaseOrderDto {
  @Matches(/^[A-Z0-9._-]{2,40}$/)
  number!: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivePurchaseLineDto)
  lines!: ReceivePurchaseLineDto[];
}
