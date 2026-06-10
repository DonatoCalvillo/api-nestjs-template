import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  HttpException,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import {
  IDEMPOTENCY_KEY_HEADER,
  IDEMPOTENCY_REPLAYED_HEADER,
  SKIP_IDEMPOTENCY_KEY,
} from '../src/modules/shared/application/idempotency/idempotency.constants';
import { IdempotencyKeyStatus } from '../src/modules/shared/application/idempotency/idempotency-key.status';
import {
  IdempotencyRecord,
  IIdempotencyRepository,
} from '../src/modules/shared/application/idempotency/ports/idempotency.repository.port';
import { IdempotencyInterceptor } from '../src/modules/shared/infrastructure/idempotency/idempotency.interceptor';
import { buildRequestHash } from '../src/modules/shared/infrastructure/idempotency/request-hash.util';

describe('IdempotencyInterceptor', () => {
  const scope = 'anonymous';
  const idempotencyKey = 'key-123';
  const method = 'POST';
  const path = '/auth/register';
  const body = { email: 'user@example.com', password: 'secret' };
  const requestHash = buildRequestHash(method, path, body);

  let interceptor: IdempotencyInterceptor;
  let repository: jest.Mocked<IIdempotencyRepository>;
  let reflector: jest.Mocked<Reflector>;
  let setHeader: jest.Mock;
  let request: {
    method: string;
    path: string;
    url: string;
    body: unknown;
    headers: Record<string, string>;
    user?: { id: string };
  };

  beforeEach(() => {
    repository = {
      claim: jest.fn(),
      complete: jest.fn(),
      deleteInProgress: jest.fn(),
      deleteExpired: jest.fn(),
    };

    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<Reflector>;

    interceptor = new IdempotencyInterceptor(repository, reflector);
    setHeader = jest.fn();
    request = {
      method,
      path,
      url: path,
      body,
      headers: {
        [IDEMPOTENCY_KEY_HEADER]: idempotencyKey,
      },
    };
  });

  const createExecutionContext = (): ExecutionContext =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({
          statusCode: HttpStatus.CREATED,
          setHeader,
        }),
      }),
      getHandler: () => ({ name: 'register' }),
      getClass: () => ({ name: 'AuthController' }),
    }) as unknown as ExecutionContext;

  const createCallHandler = (result: unknown = { id: '1' }): CallHandler => ({
    handle: () => of(result),
  });

  const completedRecord = (
    overrides: Partial<IdempotencyRecord> = {},
  ): IdempotencyRecord => ({
    id: 'record-1',
    scope,
    idempotencyKey,
    requestMethod: method,
    requestPath: path,
    requestHash,
    responseStatus: HttpStatus.CREATED,
    responseBody: { id: '1' },
    status: IdempotencyKeyStatus.Completed,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    ...overrides,
  });

  it('passes through when the idempotency header is missing', async () => {
    delete request.headers[IDEMPOTENCY_KEY_HEADER];

    const result = await lastValueFrom(
      interceptor.intercept(createExecutionContext(), createCallHandler()),
    );

    expect(result).toEqual({ id: '1' });
    expect(repository.claim).not.toHaveBeenCalled();
  });

  it('passes through when the handler is marked with SkipIdempotency', async () => {
    reflector.getAllAndOverride.mockImplementation((metadataKey) =>
      metadataKey === SKIP_IDEMPOTENCY_KEY ? true : false,
    );

    const result = await lastValueFrom(
      interceptor.intercept(createExecutionContext(), createCallHandler()),
    );

    expect(result).toEqual({ id: '1' });
    expect(repository.claim).not.toHaveBeenCalled();
  });

  it('claims and completes the first request', async () => {
    repository.claim.mockResolvedValue({ type: 'claimed' });
    repository.complete.mockResolvedValue();

    const result = await lastValueFrom(
      interceptor.intercept(createExecutionContext(), createCallHandler()),
    );

    expect(result).toEqual({ id: '1' });
    expect(repository.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        scope,
        idempotencyKey,
        requestMethod: method,
        requestPath: path,
        requestHash,
      }),
    );
    expect(repository.complete).toHaveBeenCalledWith({
      scope,
      idempotencyKey,
      responseStatus: HttpStatus.CREATED,
      responseBody: { id: '1' },
    });
    expect(setHeader).toHaveBeenCalledWith(
      IDEMPOTENCY_REPLAYED_HEADER,
      'false',
    );
  });

  it('replays a completed request with the same body', async () => {
    repository.claim.mockResolvedValue({
      type: 'replay',
      record: completedRecord(),
    });

    const result = await lastValueFrom(
      interceptor.intercept(createExecutionContext(), createCallHandler()),
    );

    expect(result).toEqual({ id: '1' });
    expect(repository.complete).not.toHaveBeenCalled();
    expect(setHeader).toHaveBeenCalledWith(IDEMPOTENCY_REPLAYED_HEADER, 'true');
  });

  it('rejects the same key with a different request body', async () => {
    repository.claim.mockResolvedValue({ type: 'hash_mismatch' });

    await expect(
      lastValueFrom(
        interceptor.intercept(createExecutionContext(), createCallHandler()),
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('returns conflict when the key is already in progress', async () => {
    repository.claim.mockResolvedValue({ type: 'in_progress' });

    await expect(
      lastValueFrom(
        interceptor.intercept(createExecutionContext(), createCallHandler()),
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(setHeader).toHaveBeenCalledWith('Retry-After', '1');
  });

  it('deletes in-progress keys after a 5xx error', async () => {
    repository.claim.mockResolvedValue({ type: 'claimed' });

    await expect(
      lastValueFrom(
        interceptor.intercept(createExecutionContext(), {
          handle: () =>
            throwError(
              () =>
                new HttpException(
                  'Server error',
                  HttpStatus.INTERNAL_SERVER_ERROR,
                ),
            ),
        }),
      ),
    ).rejects.toBeInstanceOf(HttpException);

    expect(repository.deleteInProgress).toHaveBeenCalledWith(
      scope,
      idempotencyKey,
    );
    expect(repository.complete).not.toHaveBeenCalled();
  });

  it('caches 4xx errors for later replays', async () => {
    repository.claim.mockResolvedValue({ type: 'claimed' });
    const badRequest = new HttpException(
      { message: 'Invalid email' },
      HttpStatus.BAD_REQUEST,
    );

    await expect(
      lastValueFrom(
        interceptor.intercept(createExecutionContext(), {
          handle: () => throwError(() => badRequest),
        }),
      ),
    ).rejects.toBe(badRequest);

    expect(repository.complete).toHaveBeenCalledWith({
      scope,
      idempotencyKey,
      responseStatus: HttpStatus.BAD_REQUEST,
      responseBody: { message: 'Invalid email' },
    });
  });

  it('scopes keys by authenticated user id', async () => {
    request.user = { id: 'user-42' } as { id: string };
    repository.claim.mockResolvedValue({ type: 'claimed' });
    repository.complete.mockResolvedValue();

    await lastValueFrom(
      interceptor.intercept(createExecutionContext(), createCallHandler()),
    );

    expect(repository.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'user:user-42',
      }),
    );
  });
});
