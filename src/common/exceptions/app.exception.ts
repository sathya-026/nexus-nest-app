import { ErrorCode } from '@common/constants/error-codes';
import { ErrorMessage } from '@common/constants/error-messages';
import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
    constructor(
        public readonly errorCode: ErrorCode,
        statusCode: HttpStatus,
        message?: string,
    ) {
        super({ errorCode, message: message ?? ErrorMessage[errorCode] }, statusCode);
    }
}