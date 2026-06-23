import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { defaultErrorCodeForStatus, ErrorCode } from '../constants/error-codes';
import { AppException } from '../exceptions/app.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const { statusCode, errorCode, message } = this.resolve(exception);

        if (statusCode >= 500) {
            this.logger.error(
                `${request.method} ${request.url} - ${errorCode}`,
                (exception as Error)?.stack,
            );
        }

        response.status(statusCode).json({ errorCode, message });
    }

    private resolve(exception: unknown) {
        // custom AppException codes bubble unchanged — no default mapping involved
        if (exception instanceof AppException) {
            const body = exception.getResponse() as { errorCode: string; message: string };
            return { statusCode: exception.getStatus(), errorCode: body.errorCode, message: body.message };
        }

        // class-validator / Nest built-ins (Unauthorized, Forbidden, NotFound, Conflict, ValidationPipe, etc.)
        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            return {
                statusCode: status,
                errorCode: defaultErrorCodeForStatus(status),
                message: this.extractMessage(exception.getResponse(), exception.message),
            };
        }

        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            errorCode: ErrorCode.INTERNAL_UNEXPECTED,
            message: 'Something went wrong',
        };
    }

    private extractMessage(body: unknown, fallback: string): string {
        if (typeof body === 'string') return body;
        const message = (body as any)?.message;
        return Array.isArray(message) ? message.join(', ') : message ?? fallback;
    }
}