import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  Observable,
  TimeoutError,
  catchError,
  throwError,
  timeout,
} from 'rxjs';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import { isExcludedResponsePath } from '../response/excluded-response-paths';

@Injectable()
export class RequestTimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path ?? request.url.split('?')[0];

    if (isExcludedResponsePath(path)) {
      return next.handle();
    }

    return next.handle().pipe(
      timeout(ENVIRONMENT_VARIABLES.HTTP_REQUEST_TIMEOUT_MS),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError) {
          return throwError(
            () =>
              new RequestTimeoutException(
                `Request timed out after ${ENVIRONMENT_VARIABLES.HTTP_REQUEST_TIMEOUT_MS}ms`,
              ),
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
