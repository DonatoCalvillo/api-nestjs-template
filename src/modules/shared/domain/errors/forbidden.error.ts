import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../enum/error-codes';
import { DomainError } from './error';

export class ForbiddenError extends DomainError {
  readonly httpStatus = HttpStatus.FORBIDDEN;
  readonly code: string = ErrorCodes.FORBIDDEN;

  constructor(message = 'Forbidden') {
    super(message);
  }
}
