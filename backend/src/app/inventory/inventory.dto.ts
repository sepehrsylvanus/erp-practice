import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class AdjustStockDto {
  @IsString()
  warehouseId!: string;

  @IsString()
  productId!: string;

  @Matches(/^-?\d{1,15}(\.\d{1,3})?$/)
  quantityDelta!: string;

  @IsString()
  @MaxLength(500)
  note!: string;

  @IsOptional()
  @Matches(/^\d{1,15}(\.\d{1,4})?$/)
  unitCost?: string;
}
