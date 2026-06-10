import { InternalServerErrorException } from '@nestjs/common';
import { ResponseDto } from '../response/response';
import { DomainError } from './error';
import { ErrorCodes } from '../enum/error-codes';

export class DatabaseError extends DomainError {
  constructor(cause: unknown) {
    super(
      cause instanceof Error
        ? cause.message
        : 'There was a database error with unknown cause',
    );
  }

  public toHttpException() {
    const error = ResponseDto.error(this.message, ErrorCodes.DATABASE_ERROR);
    return new InternalServerErrorException(error);
  }
}
