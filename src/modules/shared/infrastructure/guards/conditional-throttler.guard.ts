import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import { HEALTH_PATH, METRICS_PATH } from '../metrics/metrics.constants';

@Injectable()
export class ConditionalThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!ENVIRONMENT_VARIABLES.THROTTLE_ENABLED) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ method?: string; path?: string }>();

    if (
      request.method === 'GET' &&
      (request.path === HEALTH_PATH || request.path === METRICS_PATH)
    ) {
      return true;
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
