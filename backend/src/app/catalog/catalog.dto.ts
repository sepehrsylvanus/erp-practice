import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const MONEY = /^\d{1,15}(\.\d{1,2})?$/;
const QUANTITY = /^\d{1,15}(\.\d{1,3})?$/;

export class CreateProductDto {
  @Matches(/^[A-Z0-9._-]{2,32}$/)
  sku!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @MaxLength(20)
  unit!: string;

  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Matches(MONEY)
  salePrice?: string;

  @IsOptional()
  @Matches(MONEY)
  purchasePrice?: string;

  @IsOptional()
  @Matches(QUANTITY)
  reorderPoint?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Matches(MONEY)
  salePrice?: string;

  @IsOptional()
  @Matches(MONEY)
  purchasePrice?: string;

  @IsOptional()
  @Matches(QUANTITY)
  reorderPoint?: string;
}

export class CreatePartyDto {
  @Matches(/^[A-Z0-9._-]{2,32}$/)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  taxId?: string;
}
