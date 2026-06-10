import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import { ResponseDto } from '../../domain/response/response';
import { isExcludedResponsePath } from '../response/excluded-response-paths';
import { buildResponseMeta } from '../response/response-meta.util';
import { RequestWithTrace } from '../tracing/trace-context.constants';
import { TraceContextService } from '../tracing/trace-context.service';

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  constructor(private readonly traceContext: TraceContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & RequestWithTrace>();
    const path = request.path ?? request.url.split('?')[0];

    if (isExcludedResponsePath(path)) {
      return next.handle();
    }

    const meta = buildResponseMeta(request, this.traceContext);

    return next.handle().pipe(
      map((data) => {
        if (ResponseDto.isResponseDto(data)) {
          if (data.success) {
            return { ...data, meta };
          }

          return data;
        }

        return ResponseDto.success(undefined, data, meta);
      }),
    );
  }
}
