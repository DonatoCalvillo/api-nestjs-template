export interface TracingConfig {
  enabled: boolean;
  serviceName: string;
  otlpEndpoint: string;
}

const parseBoolean = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (value === undefined) return defaultValue;
  return value === 'true';
};

export const getTracingConfig = (): TracingConfig => ({
  enabled: parseBoolean(process.env.OTEL_TRACES_ENABLED, true),
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'nestjs-api-template',
  otlpEndpoint:
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ??
    'http://localhost:4318/v1/traces',
});
