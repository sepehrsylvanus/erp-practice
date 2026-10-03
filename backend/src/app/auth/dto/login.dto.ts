import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "admin@erp.local" })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ writeOnly: true, example: "your-local-seed-password" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;

  @ApiPropertyOptional({
    example: "company-demo",
    description:
      "فقط اگر کاربر به چند شرکت دسترسی دارد. در غیر این صورت حذف شود",
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}
