import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url, body, headers } = request;
    const startTime = Date.now();

    // Log request
    this.logger.log(
      `🔵 Incoming ${method} ${url} - IP: ${request.ip} - User-Agent: ${headers['user-agent']?.substring(0, 50)}...`
    );

    // Log request body (excluding sensitive data)
    if (body && Object.keys(body).length > 0) {
      const sanitizedBody = this.sanitizeBody(body);
      this.logger.debug(`📥 Request Body: ${JSON.stringify(sanitizedBody)}`);
    }

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;
        
        this.logger.log(
          `🟢 ${method} ${url} ${statusCode} - ${duration}ms`
        );

        // Log response data (truncated for readability)
        if (data) {
          const responseStr = JSON.stringify(data);
          const truncatedResponse = responseStr.length > 200 
            ? responseStr.substring(0, 200) + '...' 
            : responseStr;
          this.logger.debug(`📤 Response: ${truncatedResponse}`);
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(
          `🔴 ${method} ${url} ${error.status || 500} - ${duration}ms - Error: ${error.message}`
        );
        throw error;
      }),
    );
  }

  private sanitizeBody(body: any): any {
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'accessToken'];
    const sanitized = { ...body };

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }
}