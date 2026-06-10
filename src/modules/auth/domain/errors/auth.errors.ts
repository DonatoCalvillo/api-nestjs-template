import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ResponseDto } from '../../../shared/domain/response/response';
import { DomainError } from '../../../shared/domain/errors/error';

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('Invalid email or password');
  }

  toHttpException() {
    return new UnauthorizedException(
      ResponseDto.error(this.message, 'E-AUTH-001'),
    );
  }
}

export class EmailAlreadyExistsError extends DomainError {
  constructor() {
    super('Email is already registered');
  }

  toHttpException() {
    return new ConflictException(ResponseDto.error(this.message, 'E-AUTH-002'));
  }
}

export class InvalidRefreshTokenError extends DomainError {
  constructor() {
    super('Invalid or expired refresh token');
  }

  toHttpException() {
    return new UnauthorizedException(
      ResponseDto.error(this.message, 'E-AUTH-003'),
    );
  }
}

export class UnauthorizedAccessError extends DomainError {
  constructor(message = 'Unauthorized') {
    super(message);
  }

  toHttpException() {
    return new UnauthorizedException(
      ResponseDto.error(this.message, 'E-AUTH-004'),
    );
  }
}

export class ForbiddenAccessError extends DomainError {
  constructor(message = 'Forbidden') {
    super(message);
  }

  toHttpException() {
    return new ForbiddenException(
      ResponseDto.error(this.message, 'E-AUTH-005'),
    );
  }
}
