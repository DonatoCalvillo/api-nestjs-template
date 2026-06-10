import { Response } from 'express';
import { ResponseMeta } from '../../domain/response/response';
import { REQUEST_ID_HEADER } from '../request-context';
import {
  TRACE_ID_HEADER,
  TRACEPARENT_HEADER,
} from '../tracing/trace-context.constants';
import { TraceContextService } from '../tracing/trace-context.service';

export const setResponseTraceHeaders = (
  response: Response,
  meta: ResponseMeta,
  traceContext?: TraceContextService,
): void => {
  if (meta.requestId) {
    response.setHeader(REQUEST_ID_HEADER, meta.requestId);
  }

  const traceparent = traceContext?.getTraceparent();

  if (traceparent) {
    response.setHeader(TRACEPARENT_HEADER, traceparent);
  }

  if (meta.traceId) {
    response.setHeader(TRACE_ID_HEADER, meta.traceId);
  }
};
