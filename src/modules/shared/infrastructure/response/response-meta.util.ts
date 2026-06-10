import { Request } from 'express';
import { ResponseMeta } from '../../domain/response/response';
import { REQUEST_ID_HEADER } from '../request-context';
import {
  RequestWithTrace,
  TRACE_ID_HEADER,
} from '../tracing/trace-context.constants';
import { TraceContextService } from '../tracing/trace-context.service';

export const buildResponseMeta = (
  request: Request & RequestWithTrace,
  traceContext?: TraceContextService,
): ResponseMeta => {
  const requestId =
    (request[REQUEST_ID_HEADER] as string | undefined) ??
    (request.headers[REQUEST_ID_HEADER] as string | undefined);

  const traceId =
    request.traceId ??
    traceContext?.getTraceId() ??
    (request.headers[TRACE_ID_HEADER] as string | undefined);

  const spanId = request.spanId ?? traceContext?.getSpanId();
  const path = request.path ?? request.url.split('?')[0];

  return {
    timestamp: new Date().toISOString(),
    path,
    requestId,
    traceId,
    spanId,
  };
};
