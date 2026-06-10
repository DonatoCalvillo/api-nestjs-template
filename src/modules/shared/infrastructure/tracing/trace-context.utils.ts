import { randomBytes } from 'crypto';
import { SpanContext } from '@opentelemetry/api';
import {
  TRACE_FLAGS_SAMPLED,
  TRACEPARENT_HEADER,
} from './trace-context.constants';

const TRACEPARENT_VERSION = '00';
const TRACE_ID_LENGTH = 32;
const SPAN_ID_LENGTH = 16;

export interface TraceContextData {
  traceId: string;
  spanId: string;
  traceparent: string;
}

export const generateTraceId = (): string => randomBytes(16).toString('hex');

export const generateSpanId = (): string => randomBytes(8).toString('hex');

export const buildTraceparent = (
  traceId: string,
  spanId: string,
  flags: string = TRACE_FLAGS_SAMPLED,
): string => `${TRACEPARENT_VERSION}-${traceId}-${spanId}-${flags}`;

export const parseTraceparent = (
  header: string | undefined,
): TraceContextData | null => {
  if (!header?.trim()) {
    return null;
  }

  const parts = header.trim().split('-');

  if (parts.length !== 4) {
    return null;
  }

  const [version, traceId, spanId, flags] = parts;

  if (version !== TRACEPARENT_VERSION) {
    return null;
  }

  if (
    traceId.length !== TRACE_ID_LENGTH ||
    spanId.length !== SPAN_ID_LENGTH ||
    flags.length !== 2
  ) {
    return null;
  }

  return {
    traceId,
    spanId,
    traceparent: buildTraceparent(traceId, spanId, flags),
  };
};

export const fromSpanContext = (
  spanContext: SpanContext,
): TraceContextData => ({
  traceId: spanContext.traceId,
  spanId: spanContext.spanId,
  traceparent: buildTraceparent(
    spanContext.traceId,
    spanContext.spanId,
    spanContext.traceFlags.toString(16).padStart(2, '0'),
  ),
});

export const getTraceparentHeader = (
  headers: Record<string, string | string[] | undefined>,
): string | undefined => {
  const value = headers[TRACEPARENT_HEADER];

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return undefined;
};
