import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { NextFunction, Request, Response } from 'express';
import { Counter, Histogram } from 'prom-client';
import {
  HTTP_ERRORS_TOTAL,
  HTTP_REQUEST_DURATION_SECONDS,
  HTTP_REQUESTS_TOTAL,
  isHealthProbePath,
  METRICS_PATH,
} from './metrics.constants';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(
    @InjectMetric(HTTP_REQUEST_DURATION_SECONDS)
    private readonly requestDuration: Histogram<string>,
    @InjectMetric(HTTP_REQUESTS_TOTAL)
    private readonly requestsTotal: Counter<string>,
    @InjectMetric(HTTP_ERRORS_TOTAL)
    private readonly errorsTotal: Counter<string>,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (this.shouldSkip(req)) {
      next();
      return;
    }

    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationSeconds =
        Number(process.hrtime.bigint() - start) / 1_000_000_000;
      const route = req.route?.path ?? (req.baseUrl || req.path);
      const statusCode = String(res.statusCode);
      const labels = {
        method: req.method,
        route,
        status_code: statusCode,
      };

      this.requestDuration.observe(labels, durationSeconds);
      this.requestsTotal.inc(labels);

      const statusClass = this.getStatusClass(res.statusCode);
      if (statusClass) {
        this.errorsTotal.inc({
          method: req.method,
          route,
          status_class: statusClass,
        });
      }
    });

    next();
  }

  private shouldSkip(req: Request): boolean {
    if (req.method === 'GET' && req.path === METRICS_PATH) {
      return true;
    }

    if (req.method === 'GET' && isHealthProbePath(req.path)) {
      return true;
    }

    return false;
  }

  private getStatusClass(statusCode: number): '4xx' | '5xx' | null {
    if (statusCode >= 400 && statusCode < 500) {
      return '4xx';
    }

    if (statusCode >= 500) {
      return '5xx';
    }

    return null;
  }
}
