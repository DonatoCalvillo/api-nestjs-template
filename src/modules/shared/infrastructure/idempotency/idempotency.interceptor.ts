import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { from, Observable, of, throwError } from 'rxjs';
import { catchError, map, mergeMap, tap } from 'rxjs/operators';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import {
  IDEMPOTENCY_KEY_HEADER,
  IDEMPOTENCY_REPOSITORY,
  IDEMPOTENCY_REPLAYED_HEADER,
  IDEMPOTENT_HTTP_METHODS,
  SKIP_IDEMPOTENCY_KEY,
} from '../../application/idempotency/idempotency.constants';
import { IIdempotencyRepository } from '../../application/idempotency/ports/idempotency.repository.port';
import { HEALTH_PATH, METRICS_PATH } from '../metrics/metrics.constants';
import { resolveIdempotencyScope } from './idempotency-scope.util';
import { buildRequestHash } from './request-hash.util';

const EXCLUDED_PATHS = new Set([HEALTH_PATH, METRICS_PATH]);

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(IDEMPOTENCY_REPOSITORY)
    private readonly idempotencyRepository: IIdempotencyRepository,
    private readonly reflector: Reflector,
  ) {}

  intercept(
    executionContext: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (!ENVIRONMENT_VARIABLES.IDEMPOTENCY_ENABLED) {
      return next.handle();
    }

    if (executionContext.getType() !== 'http') {
      return next.handle();
    }

    const skipIdempotency = this.reflector.getAllAndOverride<boolean>(
      SKIP_IDEMPOTENCY_KEY,
      [executionContext.getHandler(), executionContext.getClass()],
    );

    if (skipIdempotency) {
      return next.handle();
    }

    const httpContext = executionContext.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const method = request.method.toUpperCase();

    if (
      !IDEMPOTENT_HTTP_METHODS.includes(
        method as (typeof IDEMPOTENT_HTTP_METHODS)[number],
      )
    ) {
      return next.handle();
    }

    const requestPath = request.path ?? request.url.split('?')[0];

    if (EXCLUDED_PATHS.has(requestPath)) {
      return next.handle();
    }

    const idempotencyKey = this.readIdempotencyKey(request);

    if (!idempotencyKey) {
      return next.handle();
    }

    const scope = resolveIdempotencyScope(request);
    const requestHash = buildRequestHash(method, requestPath, request.body);
    const expiresAt = new Date(
      Date.now() + ENVIRONMENT_VARIABLES.IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000,
    );

    return from(
      this.idempotencyRepository.claim({
        scope,
        idempotencyKey,
        requestMethod: method,
        requestPath,
        requestHash,
        expiresAt,
      }),
    ).pipe(
      mergeMap((claimResult) => {
        if (claimResult.type === 'hash_mismatch') {
          return throwError(
            () =>
              new UnprocessableEntityException({
                message:
                  'Idempotency key was already used with a different request body',
              }),
          );
        }

        if (claimResult.type === 'in_progress') {
          response.setHeader('Retry-After', '1');
          return throwError(
            () =>
              new ConflictException({
                message: 'Idempotency key in use',
              }),
          );
        }

        if (claimResult.type === 'replay') {
          response.setHeader(IDEMPOTENCY_REPLAYED_HEADER, 'true');

          const { record } = claimResult;
          const status = record.responseStatus ?? HttpStatus.OK;

          if (status >= HttpStatus.BAD_REQUEST) {
            return throwError(
              () => new HttpException(record.responseBody, status),
            );
          }

          return of(record.responseBody);
        }

        return next.handle().pipe(
          mergeMap((body) =>
            from(
              this.idempotencyRepository.complete({
                scope,
                idempotencyKey,
                responseStatus: response.statusCode || HttpStatus.OK,
                responseBody: body,
              }),
            ).pipe(
              tap(() =>
                response.setHeader(IDEMPOTENCY_REPLAYED_HEADER, 'false'),
              ),
              map(() => body),
            ),
          ),
          catchError((error: unknown) =>
            from(this.handleFailure(scope, idempotencyKey, error)).pipe(
              mergeMap(() => throwError(() => error)),
            ),
          ),
        );
      }),
    );
  }

  private readIdempotencyKey(request: Request): string | null {
    const headerValue = request.headers[IDEMPOTENCY_KEY_HEADER];

    if (!headerValue) {
      return null;
    }

    const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  private async handleFailure(
    scope: string,
    idempotencyKey: string,
    error: unknown,
  ): Promise<void> {
    if (error instanceof HttpException) {
      const status = error.getStatus();

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        await this.idempotencyRepository.deleteInProgress(
          scope,
          idempotencyKey,
        );
        return;
      }

      await this.idempotencyRepository.complete({
        scope,
        idempotencyKey,
        responseStatus: status,
        responseBody: error.getResponse(),
      });

      return;
    }

    await this.idempotencyRepository.deleteInProgress(scope, idempotencyKey);
  }
}
