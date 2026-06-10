export interface MetricsConfig {
  enabled: boolean;
  path: string;
  defaultMetricsEnabled: boolean;
}

const parseBoolean = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (value === undefined) return defaultValue;
  return value === 'true';
};

export const getMetricsConfig = (): MetricsConfig => ({
  enabled: parseBoolean(process.env.METRICS_ENABLED, true),
  path: '/metrics',
  defaultMetricsEnabled: true,
});
