import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../enum/error-codes';
import { DomainError } from './error';

export class UnauthorizedError extends DomainError {
  readonly httpStatus = HttpStatus.UNAUTHORIZED;
  readonly code: string = ErrorCodes.UNAUTHORIZED;

  constructor(message = 'Unauthorized') {
    super(message);
  }
}
