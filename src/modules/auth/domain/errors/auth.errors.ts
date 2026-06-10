import { ConflictError } from '../../../shared/domain/errors/conflict.error';
import { ForbiddenError } from '../../../shared/domain/errors/forbidden.error';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error';

export class InvalidCredentialsError extends UnauthorizedError {
  readonly code: string = 'E-AUTH-001';

  constructor() {
    super('Invalid email or password');
  }
}

export class EmailAlreadyExistsError extends ConflictError {
  readonly code: string = 'E-AUTH-002';

  constructor() {
    super('Email is already registered');
  }
}

export class InvalidRefreshTokenError extends UnauthorizedError {
  readonly code: string = 'E-AUTH-003';

  constructor() {
    super('Invalid or expired refresh token');
  }
}

export class UnauthorizedAccessError extends UnauthorizedError {
  readonly code: string = 'E-AUTH-004';

  constructor(message = 'Unauthorized') {
    super(message);
  }
}

export class ForbiddenAccessError extends ForbiddenError {
  readonly code: string = 'E-AUTH-005';

  constructor(message = 'Forbidden') {
    super(message);
  }
}
