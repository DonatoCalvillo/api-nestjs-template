import { HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../enum/error-codes';
import { DomainError } from './error';

export class ExternalServiceError extends DomainError {
  readonly httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
  readonly code: string = ErrorCodes.EXTERNAL_SERVICE;

  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

export class CircuitBreakerOpenError extends DomainError {
  readonly httpStatus = HttpStatus.SERVICE_UNAVAILABLE;
  readonly code: string = ErrorCodes.CIRCUIT_OPEN;

  constructor(public readonly serviceKey: string) {
    super(`Circuit breaker is open for service: ${serviceKey}`);
  }
}
