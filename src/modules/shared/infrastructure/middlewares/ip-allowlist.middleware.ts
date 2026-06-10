import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';

@Injectable()
export class IpAllowlistMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (!ENVIRONMENT_VARIABLES.IP_FILTER_ENABLED) {
      next();
      return;
    }

    if (
      req.method === 'GET' &&
      (req.path === '/healthy' || req.path === '/metrics')
    ) {
      next();
      return;
    }

    const clientIp = req.ip;

    if (clientIp && ENVIRONMENT_VARIABLES.IP_ALLOWLIST.includes(clientIp)) {
      next();
      return;
    }

    res.status(403).json({
      statusCode: 403,
      message: 'Forbidden',
    });
  }
}
