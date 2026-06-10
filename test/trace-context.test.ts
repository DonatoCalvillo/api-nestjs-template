import {
  buildTraceparent,
  fromSpanContext,
  generateSpanId,
  generateTraceId,
  getTraceparentHeader,
  parseTraceparent,
} from '../src/modules/shared/infrastructure/tracing/trace-context.utils';
import { TraceFlags } from '@opentelemetry/api';

describe('trace-context.utils', () => {
  describe('buildTraceparent', () => {
    it('builds a valid W3C traceparent header', () => {
      const traceId = 'a'.repeat(32);
      const spanId = 'b'.repeat(16);

      expect(buildTraceparent(traceId, spanId)).toBe(
        `00-${traceId}-${spanId}-01`,
      );
    });
  });

  describe('parseTraceparent', () => {
    it('parses a valid traceparent header', () => {
      const traceId = 'a'.repeat(32);
      const spanId = 'b'.repeat(16);
      const header = buildTraceparent(traceId, spanId);

      expect(parseTraceparent(header)).toEqual({
        traceId,
        spanId,
        traceparent: header,
      });
    });

    it('returns null for invalid traceparent', () => {
      expect(parseTraceparent(undefined)).toBeNull();
      expect(parseTraceparent('invalid')).toBeNull();
      expect(parseTraceparent('01-abc-def-01')).toBeNull();
    });
  });

  describe('generateTraceId / generateSpanId', () => {
    it('generates ids with correct lengths', () => {
      expect(generateTraceId()).toHaveLength(32);
      expect(generateSpanId()).toHaveLength(16);
    });
  });

  describe('fromSpanContext', () => {
    it('maps span context to trace fields', () => {
      const traceId = 'c'.repeat(32);
      const spanId = 'd'.repeat(16);

      const result = fromSpanContext({
        traceId,
        spanId,
        traceFlags: TraceFlags.SAMPLED,
        isRemote: false,
      });

      expect(result).toEqual({
        traceId,
        spanId,
        traceparent: buildTraceparent(traceId, spanId, '01'),
      });
    });
  });

  describe('getTraceparentHeader', () => {
    it('extracts traceparent from headers', () => {
      const traceparent = buildTraceparent('e'.repeat(32), 'f'.repeat(16));

      expect(getTraceparentHeader({ traceparent })).toBe(traceparent);
    });
  });
});
