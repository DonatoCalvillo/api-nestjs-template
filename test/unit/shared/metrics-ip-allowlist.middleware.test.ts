const mockEnv = {
  METRICS_IP_FILTER_ENABLED: true,
  METRICS_IP_ALLOWLIST: ['127.0.0.1', '::1'],
};

jest.mock('../../../src/configuration/environments-variables', () => ({
  ENVIRONMENT_VARIABLES: mockEnv,
}));

import { MetricsIpAllowlistMiddleware } from '../../../src/modules/shared/infrastructure/middlewares/metrics-ip-allowlist.middleware';

describe('MetricsIpAllowlistMiddleware', () => {
  const middleware = new MetricsIpAllowlistMiddleware();

  const createReq = (path: string, method: string, ip?: string) =>
    ({ path, method, ip }) as never;

  it('allows GET /metrics from an allowlisted IP', () => {
    const next = jest.fn();

    middleware.use(
      createReq('/metrics', 'GET', '127.0.0.1'),
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('blocks GET /metrics from a non-allowlisted IP', () => {
    const next = jest.fn();

    middleware.use(
      createReq('/metrics', 'GET', '203.0.113.1'),
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Forbidden' }),
    );
  });

  it('passes through non-metrics routes', () => {
    const next = jest.fn();

    middleware.use(
      createReq('/api/v1/users', 'GET', '203.0.113.1'),
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('allows any IP when METRICS_IP_FILTER_ENABLED is false', () => {
    mockEnv.METRICS_IP_FILTER_ENABLED = false;
    const next = jest.fn();

    middleware.use(
      createReq('/metrics', 'GET', '203.0.113.1'),
      {} as never,
      next,
    );

    expect(next).toHaveBeenCalledWith();
    mockEnv.METRICS_IP_FILTER_ENABLED = true;
  });
});
