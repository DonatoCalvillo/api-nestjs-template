import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';

@Injectable()
export class ConditionalThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!ENVIRONMENT_VARIABLES.THROTTLE_ENABLED) {
      return true;
    }

    return super.canActivate(context) as Promise<boolean>;
  }
}
