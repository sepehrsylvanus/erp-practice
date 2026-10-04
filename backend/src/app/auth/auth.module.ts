import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "@erp/backend-database";
import { JwtAuthGuard } from "./jwt-auth.guard";

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

if (!accessSecret || accessSecret.length < 32) {
  throw new Error("JWT_ACCESS_SECRET must contain at least 32 characters");
}

if (!refreshSecret || refreshSecret.length < 32) {
  throw new Error("JWT_REFRESH_SECRET must contain at least 32 characters");
}

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: accessSecret,
      signOptions: { expiresIn: "15m" },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 30 }],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, ThrottlerGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
