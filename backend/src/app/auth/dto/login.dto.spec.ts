import { describe, expect, it } from "vitest";
import { BadRequestException, ValidationPipe } from "@nestjs/common";
import type { ArgumentMetadata } from "@nestjs/common";
import { LoginDto } from "./login.dto";

describe("LoginDto validation", () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const metadata: ArgumentMetadata = {
    type: "body",
    metatype: LoginDto,
  };

  it("rejects an invalid email", async () => {
    await expect(
      pipe.transform({ email: "not-an-email", password: "secret" }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects fields not declared in the DTO", async () => {
    await expect(
      pipe.transform(
        { email: "[email protected]", password: "secret", role: "ADMIN" },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
