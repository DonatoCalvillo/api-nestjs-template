import { HttpStatus } from '@nestjs/common';
import { ErrorCodes, ErrorCodesMessages } from '../enum/error-codes';
import { DomainError } from './error';

export class ValidationError extends DomainError {
  readonly httpStatus = HttpStatus.BAD_REQUEST;
  readonly code: string = ErrorCodes.VALIDATION;

  constructor(message = ErrorCodesMessages[ErrorCodes.VALIDATION]()) {
    super(message);
  }
}
