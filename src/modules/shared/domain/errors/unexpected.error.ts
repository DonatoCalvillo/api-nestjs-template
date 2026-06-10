import { HttpStatus } from '@nestjs/common';
import { ErrorCodes, ErrorCodesMessages } from '../enum/error-codes';
import { DomainError } from './error';

export class UnexpectedError extends DomainError {
  readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
  readonly code: string = ErrorCodes.UNEXPECTED_ERROR;

  constructor(message = ErrorCodesMessages[ErrorCodes.UNEXPECTED_ERROR]()) {
    super(message);
  }
}
