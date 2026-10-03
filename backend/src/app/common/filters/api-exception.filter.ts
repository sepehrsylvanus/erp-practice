import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";

import type { Request, Response } from "express";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest() as Request;
    const response = http.getResponse() as Response;
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw =
      exception instanceof HttpException ? exception.getResponse() : null;
    const body =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const isInternal = status >= 500;
    const rawMessage = body.message;
    const message = isInternal
      ? "Internal server error"
      : typeof raw === "string"
        ? body.code
        : `HTTP_${status}`;

    const code = isInternal
      ? "INTERNAL_ERROR"
      : typeof body.code === "string"
        ? body.code
        : `HTTP_${status}`;

    const details = isInternal
      ? null
      : (body.details ?? (Array.isArray(rawMessage) ? rawMessage : null));

    const requestId =
      response.locals.requestId ?? request.header("x-request-id") ?? null;

    if (isInternal) {
      const stack =
        exception instanceof Error ? exception.stack : String(exception);

      this.logger.error(
        `Unhandled API error requestId=${requestId ?? "unknown"}`,
        stack,
      );
    }

    response.status(status).json({
      code,
      message,
      details,
      requestId,
    });
  }
}
