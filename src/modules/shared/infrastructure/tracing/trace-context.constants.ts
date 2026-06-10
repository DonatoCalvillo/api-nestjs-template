export const TRACEPARENT_HEADER = 'traceparent';
export const TRACESTATE_HEADER = 'tracestate';
export const TRACE_ID_HEADER = 'x-trace-id';

export const CLS_TRACE_ID = 'traceId';
export const CLS_SPAN_ID = 'spanId';
export const CLS_TRACEPARENT = 'traceparent';

export const TRACE_FLAGS_SAMPLED = '01';

export type RequestWithTrace = {
  traceId?: string;
  spanId?: string;
  traceparent?: string;
};
