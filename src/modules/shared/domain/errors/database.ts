import { InternalServerErrorException } from '@nestjs/common';
import { ResponseDto } from '../response/response';
import { DomainError } from './error';
import { ErrorCodes } from '../enum/error-codes';

export class DatabaseError extends DomainError {
  constructor(cause: string) {
    super(cause || 'There was a database error');
  }

  public toHttpException() {
    const error = ResponseDto.error(this.message, ErrorCodes.DATABASE_ERROR);
    return new InternalServerErrorException(error);
  }
}
