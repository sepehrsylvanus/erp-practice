import "dotenv/config";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { ApiExceptionFilter } from "./app/common/filters/api-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header("x-request-id");
    const requestId =
      incoming && /^[A-Za-z0-9._-]{1,80}$/.test(incoming)
        ? incoming
        : randomUUID();

    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  });

  app.useGlobalFilters(new ApiExceptionFilter());

  const globalPrefix = "api/v1";
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? "http://localhost:4200").split(","),
    credentials: true,
  });
  app.enableShutdownHooks();
  const isProduction = process.env.NODE_ENV === "production";
  const swaggerEnabled =
    !isProduction || process.env.SWAGGER_ENABLED === "true";

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("ERP API")
      .setDescription("The ERP API description")
      .setVersion("1.0")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document, { useGlobalPrefix: false });
  }

  const port = process.env.PORT || 3000;
  await app.listen(Number(port), "0.0.0.0");
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
