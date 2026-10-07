import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from "class-validator";

const MONEY = /^\d{1,15}(\.\d{1,2})?$/;

export class CreateInvoiceDto {
  @IsIn(["SALES", "PURCHASE"])
  type!: "SALES" | "PURCHASE";

  @IsOptional()
  @IsString()
  salesOrderId?: string;

  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class PaymentAllocationDto {
  @IsString()
  invoiceId!: string;

  @Matches(MONEY)
  amount!: string;
}

export class CreatePaymentDto {
  @IsIn(["INCOMING", "OUTGOING"])
  direction!: "INCOMING" | "OUTGOING";

  @Matches(MONEY)
  amount!: string;

  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @IsIn(["BANK_TRANSFER", "CASH", "CARD", "OTHER"])
  method!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations!: PaymentAllocationDto[];
}
