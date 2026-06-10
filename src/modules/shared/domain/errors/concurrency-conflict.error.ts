import { ConflictException } from '@nestjs/common';
import { ResponseDto } from '../response/response';
import { DomainError } from './error';
import { ErrorCodes, ErrorCodesMessages } from '../enum/error-codes';

export class ConcurrencyConflictError extends DomainError {
  constructor(entityId?: string) {
    super(
      entityId
        ? `Record ${entityId} was modified by another request. Reload and try again.`
        : ErrorCodesMessages[ErrorCodes.CONCURRENCY_CONFLICT](),
    );
  }

  public toHttpException() {
    const error = ResponseDto.error(
      this.message,
      ErrorCodes.CONCURRENCY_CONFLICT,
    );
    return new ConflictException(error);
  }
}
