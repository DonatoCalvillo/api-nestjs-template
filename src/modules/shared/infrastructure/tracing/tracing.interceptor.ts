import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { context as otelContext, trace } from '@opentelemetry/api';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestWithTrace } from './trace-context.constants';
import { TraceContextService } from './trace-context.service';
import { fromSpanContext } from './trace-context.utils';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(private readonly traceContext: TraceContextService) {}

  intercept(
    executionContext: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const httpContext = executionContext.switchToHttp();
    const request = httpContext.getRequest<Request & RequestWithTrace>();
    const response = httpContext.getResponse<Response>();
    const tracer = trace.getTracer('nestjs-http');
    const handlerName = executionContext.getHandler().name;
    const controllerName = executionContext.getClass().name;
    const route = request.route?.path ?? request.url;
    const parentContext = otelContext.active();
    const parentSpan = trace.getActiveSpan();

    const span = tracer.startSpan(
      `${controllerName}.${handlerName}`,
      {
        attributes: {
          'nestjs.controller': controllerName,
          'nestjs.handler': handlerName,
          'http.route': route,
        },
      },
      parentSpan ? trace.setSpan(parentContext, parentSpan) : parentContext,
    );

    return otelContext.with(trace.setSpan(parentContext, span), () => {
      const traceData = fromSpanContext(span.spanContext());
      this.traceContext.setContext(traceData);
      this.traceContext.attachToRequest(request);
      this.traceContext.setResponseHeaders((name, value) =>
        response.setHeader(name, value),
      );

      return next.handle().pipe(
        tap({
          finalize: () => {
            span.end();
          },
        }),
      );
    });
  }
}
