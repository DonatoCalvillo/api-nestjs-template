import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../enum/error-codes';
import { DomainError } from './error';

export class NotFoundError extends DomainError {
  readonly httpStatus = HttpStatus.NOT_FOUND;
  readonly code: string = ErrorCodes.NOT_FOUND;

  constructor(message = 'Resource not found') {
    super(message);
  }
}
