import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ErrorPayload = {
  code?: string;
  error?: string;
  message?: string | string[];
  missingRequirements?: string[];
};

function isErrorPayload(value: unknown): value is ErrorPayload {
  return typeof value === 'object' && value !== null;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined;
    const payload = isErrorPayload(exceptionResponse)
      ? exceptionResponse
      : undefined;

    response.status(statusCode).json({
      ...(payload?.code ? { code: payload.code } : {}),
      error:
        payload?.error ??
        (statusCode === 500 ? 'Internal Server Error' : 'Request Error'),
      message:
        payload?.message ??
        (typeof exceptionResponse === 'string'
          ? exceptionResponse
          : 'Não foi possível processar a solicitação.'),
      ...(Array.isArray(payload?.missingRequirements)
        ? { missingRequirements: payload.missingRequirements }
        : {}),
      path: request.originalUrl,
      statusCode,
      timestamp: new Date().toISOString(),
    });
  }
}
