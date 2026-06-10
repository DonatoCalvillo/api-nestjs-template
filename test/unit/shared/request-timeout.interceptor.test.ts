import {
  CallHandler,
  ExecutionContext,
  RequestTimeoutException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ENVIRONMENT_VARIABLES } from '../../../src/configuration/environments-variables';
import { RequestTimeoutInterceptor } from '../../../src/modules/shared/infrastructure/interceptors/request-timeout.interceptor';

const createExecutionContext = (path: string): ExecutionContext =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => ({
        path,
        url: path,
      }),
    }),
  }) as ExecutionContext;

describe('RequestTimeoutInterceptor', () => {
  const interceptor = new RequestTimeoutInterceptor();
  const originalTimeout = ENVIRONMENT_VARIABLES.HTTP_REQUEST_TIMEOUT_MS;

  afterEach(() => {
    ENVIRONMENT_VARIABLES.HTTP_REQUEST_TIMEOUT_MS = originalTimeout;
  });

  it('throws RequestTimeoutException when the handler exceeds the timeout', async () => {
    ENVIRONMENT_VARIABLES.HTTP_REQUEST_TIMEOUT_MS = 50;

    const context = createExecutionContext('/users');
    const next: CallHandler = {
      handle: () => of('ok').pipe(delay(200)),
    };

    await expect(
      new Promise((resolve, reject) => {
        interceptor.intercept(context, next).subscribe({
          next: resolve,
          error: reject,
        });
      }),
    ).rejects.toBeInstanceOf(RequestTimeoutException);
  });

  it('skips timeout enforcement for health probe paths', async () => {
    ENVIRONMENT_VARIABLES.HTTP_REQUEST_TIMEOUT_MS = 50;

    const context = createExecutionContext('/health/live');
    const next: CallHandler = {
      handle: () => of('ok').pipe(delay(200)),
    };

    await expect(
      new Promise((resolve, reject) => {
        interceptor.intercept(context, next).subscribe({
          next: resolve,
          error: reject,
        });
      }),
    ).resolves.toBe('ok');
  });

  it('rethrows non-timeout errors unchanged', async () => {
    const context = createExecutionContext('/users');
    const expectedError = new Error('boom');
    const next: CallHandler = {
      handle: () => throwError(() => expectedError),
    };

    await expect(
      new Promise((resolve, reject) => {
        interceptor.intercept(context, next).subscribe({
          next: resolve,
          error: reject,
        });
      }),
    ).rejects.toBe(expectedError);
  });
});
