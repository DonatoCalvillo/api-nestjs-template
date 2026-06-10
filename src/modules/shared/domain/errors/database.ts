import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../enum/error-codes';
import { DomainError } from './error';

export class DatabaseError extends DomainError {
  readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
  readonly code: string = ErrorCodes.DATABASE_ERROR;

  constructor(cause: unknown) {
    super(
      cause instanceof Error
        ? cause.message
        : 'There was a database error with unknown cause',
    );
  }
}
