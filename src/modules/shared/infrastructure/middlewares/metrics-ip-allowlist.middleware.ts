import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import { ForbiddenError } from '../../domain/errors/forbidden.error';
import { METRICS_PATH } from '../metrics/metrics.constants';
import { isClientIpAllowed } from './is-client-ip-allowed.util';

@Injectable()
export class MetricsIpAllowlistMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (req.path !== METRICS_PATH || req.method !== 'GET') {
      next();
      return;
    }

    if (!ENVIRONMENT_VARIABLES.METRICS_IP_FILTER_ENABLED) {
      next();
      return;
    }

    if (isClientIpAllowed(req.ip, ENVIRONMENT_VARIABLES.METRICS_IP_ALLOWLIST)) {
      next();
      return;
    }

    next(new ForbiddenError());
  }
}
