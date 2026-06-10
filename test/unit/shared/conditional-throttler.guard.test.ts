jest.mock('../../../src/configuration/environments-variables', () => ({
  ENVIRONMENT_VARIABLES: {
    THROTTLE_ENABLED: true,
  },
}));

import { ConditionalThrottlerGuard } from '../../../src/modules/shared/infrastructure/guards/conditional-throttler.guard';

describe('ConditionalThrottlerGuard', () => {
  const guard = new ConditionalThrottlerGuard(
    {} as never,
    {} as never,
    {} as never,
  );

  it('tracks authenticated users by user id', async () => {
    const tracker = await guard['getTracker']({
      user: { id: 'user-123' },
      ip: '127.0.0.1',
    });

    expect(tracker).toBe('user:user-123');
  });

  it('falls back to IP for anonymous requests', async () => {
    const tracker = await guard['getTracker']({ ip: '203.0.113.5' });

    expect(tracker).toBe('203.0.113.5');
  });

  it('uses unknown when IP is missing', async () => {
    const tracker = await guard['getTracker']({});

    expect(tracker).toBe('unknown');
  });
});
