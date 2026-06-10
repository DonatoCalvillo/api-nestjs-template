import { HttpException, HttpStatus } from '@nestjs/common';
import { ResponseDto } from '../response/response';

export abstract class DomainError extends Error {
  abstract readonly httpStatus: HttpStatus;
  abstract readonly code: string;

  protected constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toHttpException(): HttpException {
    return new HttpException(
      ResponseDto.error(this.message, this.code),
      this.httpStatus,
    );
  }
}
