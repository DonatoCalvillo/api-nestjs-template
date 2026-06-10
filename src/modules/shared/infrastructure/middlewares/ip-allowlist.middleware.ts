import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import { ForbiddenError } from '../../domain/errors/forbidden.error';
import { isHealthProbePath, METRICS_PATH } from '../metrics/metrics.constants';

@Injectable()
export class IpAllowlistMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (!ENVIRONMENT_VARIABLES.IP_FILTER_ENABLED) {
      next();
      return;
    }

    if (
      req.method === 'GET' &&
      (isHealthProbePath(req.path) || req.path === METRICS_PATH)
    ) {
      next();
      return;
    }

    const clientIp = req.ip;

    if (clientIp && ENVIRONMENT_VARIABLES.IP_ALLOWLIST.includes(clientIp)) {
      next();
      return;
    }

    next(new ForbiddenError());
  }
}
