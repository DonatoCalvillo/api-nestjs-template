import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../enum/error-codes';
import { DomainError } from './error';

export class ConflictError extends DomainError {
  readonly httpStatus = HttpStatus.CONFLICT;
  readonly code: string = ErrorCodes.CONFLICT;

  constructor(message = 'Conflict') {
    super(message);
  }
}
