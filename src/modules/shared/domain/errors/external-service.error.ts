import { ServiceUnavailableException } from '@nestjs/common';
import { ResponseDto } from '../response/response';
import { DomainError } from './error';
import { ErrorCodes } from '../enum/error-codes';

export class ExternalServiceError extends DomainError {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }

  public toHttpException() {
    const error = ResponseDto.error(this.message, ErrorCodes.EXTERNAL_SERVICE);
    return new ServiceUnavailableException(error);
  }
}

export class CircuitBreakerOpenError extends DomainError {
  constructor(public readonly serviceKey: string) {
    super(`Circuit breaker is open for service: ${serviceKey}`);
  }

  public toHttpException() {
    const error = ResponseDto.error(this.message, ErrorCodes.CIRCUIT_OPEN);
    return new ServiceUnavailableException(error);
  }
}
