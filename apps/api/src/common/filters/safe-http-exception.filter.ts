import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { StructuredLoggerService } from '../logger/structured-logger.service';

interface HttpResponseWriter {
  status: (code: number) => { json: (body: Record<string, unknown>) => void };
}

interface HttpRequestMeta {
  method?: string;
  url?: string;
}

@Catch()
export class SafeHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new StructuredLoggerService();

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<HttpResponseWriter>();
    const request = ctx.getRequest<HttpRequestMeta>();

    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError();
      const firstIssue = zodError.issues[0];
      const safeMessage =
        firstIssue && firstIssue.code !== 'unrecognized_keys'
          ? firstIssue.message
          : 'Dados de entrada inválidos. Verifique os campos informados.';

      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: safeMessage,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const record = exceptionResponse as Record<string, unknown>;
        // Preserva payloads de domínio explícitos (ex.: HealthResponse em 503) sem vazar stack
        if (typeof record['status'] === 'string' && typeof record['database'] === 'string') {
          response.status(status).json(record);
          return;
        }

        const body: Record<string, unknown> = {
          statusCode: status,
          message:
            typeof record['message'] === 'string'
              ? record['message']
              : 'Não foi possível concluir sua solicitação.',
        };
        if (typeof record['code'] === 'string') {
          body['code'] = record['code'];
        }
        response.status(status).json(body);
        return;
      }

      response.status(status).json({
        statusCode: status,
        message:
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : 'Não foi possível concluir sua solicitação.',
      });
      return;
    }

    this.logger.error(
      {
        event: 'unhandled_http_exception',
        method: request.method,
        path: request.url,
        error: exception instanceof Error ? exception : String(exception),
      },
      undefined,
      'SafeHttpExceptionFilter',
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno inesperado. Tente novamente em instantes.',
    });
  }
}
