jest.mock('../../../src/configuration/environments-variables', () => ({
  ENVIRONMENT_VARIABLES: {
    THROTTLE_TTL: 60,
    THROTTLE_LIMIT: 100,
    THROTTLE_STORAGE: 'memory',
  },
}));

import Redis from 'ioredis';
import { buildThrottlerModuleOptions } from '../../../src/configuration/throttler.config';

type ThrottlerObjectOptions = Exclude<
  ReturnType<typeof buildThrottlerModuleOptions>,
  unknown[]
>;

describe('buildThrottlerModuleOptions', () => {
  it('returns in-memory options by default', () => {
    const options = buildThrottlerModuleOptions(null) as ThrottlerObjectOptions;

    expect(options.throttlers).toEqual([{ ttl: 60000, limit: 100 }]);
    expect(options.storage).toBeUndefined();
  });

  it('uses redis storage when THROTTLE_STORAGE is redis', () => {
    const env = jest.requireMock(
      '../../../src/configuration/environments-variables',
    );
    env.ENVIRONMENT_VARIABLES.THROTTLE_STORAGE = 'redis';

    const redis = {} as Redis;
    const options = buildThrottlerModuleOptions(
      redis,
    ) as ThrottlerObjectOptions;

    expect(options.storage).toBeDefined();

    env.ENVIRONMENT_VARIABLES.THROTTLE_STORAGE = 'memory';
  });
});
