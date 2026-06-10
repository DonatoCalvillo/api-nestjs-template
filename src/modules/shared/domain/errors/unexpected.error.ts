import { InternalServerErrorException } from '@nestjs/common';
import { ErrorCodes } from '../enum/error-codes';
import { ResponseDto } from '../response/response';
import { DomainError } from './error';

export class UnexpectedError extends DomainError {
  constructor(message = 'An unexpected error occurred') {
    super(message);
  }

  public toHttpException() {
    const error = ResponseDto.error(this.message, ErrorCodes.UNEXPECTED_ERROR);
    return new InternalServerErrorException(error);
  }
}
