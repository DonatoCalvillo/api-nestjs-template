import { InternalServerErrorException } from '@nestjs/common';
import { ResponseDto } from '../response/response';

export abstract class DomainError extends Error {
  protected constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toHttpException() {
    const error = ResponseDto.error(this.message);
    return new InternalServerErrorException(error);
  }
}
