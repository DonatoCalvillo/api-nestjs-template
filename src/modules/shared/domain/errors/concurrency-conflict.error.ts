import { HttpStatus } from '@nestjs/common';
import { ErrorCodes, ErrorCodesMessages } from '../enum/error-codes';
import { DomainError } from './error';

export class ConcurrencyConflictError extends DomainError {
  readonly httpStatus = HttpStatus.CONFLICT;
  readonly code: string = ErrorCodes.CONCURRENCY_CONFLICT;

  constructor(entityId?: string) {
    super(
      entityId
        ? `Record ${entityId} was modified by another request. Reload and try again.`
        : ErrorCodesMessages[ErrorCodes.CONCURRENCY_CONFLICT](),
    );
  }
}
