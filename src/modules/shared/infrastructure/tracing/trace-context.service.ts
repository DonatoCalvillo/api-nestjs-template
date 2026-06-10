import { Injectable } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { ClsService } from 'nestjs-cls';
import {
  CLS_SPAN_ID,
  CLS_TRACE_ID,
  CLS_TRACEPARENT,
  RequestWithTrace,
  TRACE_ID_HEADER,
  TRACEPARENT_HEADER,
} from './trace-context.constants';
import { fromSpanContext, TraceContextData } from './trace-context.utils';

@Injectable()
export class TraceContextService {
  constructor(private readonly cls: ClsService) {}

  getActiveContext(): TraceContextData | null {
    const stored = this.getFromCls();

    if (stored) {
      return stored;
    }

    const span = trace.getActiveSpan();

    if (!span) {
      return null;
    }

    const spanContext = span.spanContext();

    if (!spanContext.traceId || !spanContext.spanId) {
      return null;
    }

    return fromSpanContext(spanContext);
  }

  getTraceId(): string | undefined {
    return this.getActiveContext()?.traceId;
  }

  getSpanId(): string | undefined {
    return this.getActiveContext()?.spanId;
  }

  getTraceparent(): string | undefined {
    return this.getActiveContext()?.traceparent;
  }

  setContext(context: TraceContextData): void {
    this.cls.set(CLS_TRACE_ID, context.traceId);
    this.cls.set(CLS_SPAN_ID, context.spanId);
    this.cls.set(CLS_TRACEPARENT, context.traceparent);
  }

  attachToRequest(request: RequestWithTrace): void {
    const context = this.getActiveContext();

    if (!context) {
      return;
    }

    request.traceId = context.traceId;
    request.spanId = context.spanId;
    request.traceparent = context.traceparent;
  }

  setResponseHeaders(setHeader: (name: string, value: string) => void): void {
    const context = this.getActiveContext();

    if (!context) {
      return;
    }

    setHeader(TRACEPARENT_HEADER, context.traceparent);
    setHeader(TRACE_ID_HEADER, context.traceId);
  }

  private getFromCls(): TraceContextData | null {
    const traceId = this.cls.get<string>(CLS_TRACE_ID);
    const spanId = this.cls.get<string>(CLS_SPAN_ID);
    const traceparent = this.cls.get<string>(CLS_TRACEPARENT);

    if (!traceId || !spanId || !traceparent) {
      return null;
    }

    return { traceId, spanId, traceparent };
  }
}
