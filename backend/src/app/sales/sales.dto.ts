import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsDateString,
  IS_OPTIONAL,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
  IsOptional,
} from "class-validator";

const MONEY = /^\d{1,15}(\.\d{1,2})?$/;
const QUANTITY = /^\d{1,15}(\.\d{1,3})?$/;
const RATE = /^\d{1,2}(\.\d{1,2})?$/;

export class SalesOrderLineDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  description?: string;

  @Matches(QUANTITY)
  quantity!: string;

  @Matches(MONEY)
  unitPrice!: string;

  @IsOptional()
  @Matches(RATE)
  taxRate?: string;
}

export class CreateSalesOrderDto {
  @IsString()
  customerId!: string;

  @IsString()
  branchId!: string;

  @IsString()
  warehouseId!: string;

  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesOrderLineDto)
  lines!: SalesOrderLineDto[];
}

export class ShipmentLineDto {
  @IsString()
  salesOrderLineId!: string;

  @Matches(QUANTITY)
  quantity!: string;
}

export class CreateShipmentDto {
  @Matches(/^[A-Z0-9._-]{2,40}$/)
  number!: string;

  @IsOptional()
  @IsDateString()
  shippedAt?: string;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShipmentLineDto)
  lines!: ShipmentLineDto[];
}
