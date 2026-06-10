import { DomainError } from '../../domain/errors/error';

export class Result<T, E extends DomainError = DomainError> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly value?: T,
    public readonly error?: E,
  ) {}

  get isFailure(): boolean {
    return !this.isSuccess;
  }

  static ok<T>(value: T): Result<T, never> {
    return new Result(true, value);
  }

  static fail<E extends DomainError>(error: E): Result<never, E> {
    return new Result<never, E>(false, undefined as never, error);
  }
}
