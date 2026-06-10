import { EventEmitter } from 'events';
import { NextFunction, Request, Response } from 'express';
import { Counter, Histogram } from 'prom-client';
import { MetricsMiddleware } from '../src/modules/shared/infrastructure/metrics/metrics.middleware';

describe('MetricsMiddleware', () => {
  let middleware: MetricsMiddleware;
  let requestDuration: jest.Mocked<Histogram<string>>;
  let requestsTotal: jest.Mocked<Counter<string>>;
  let errorsTotal: jest.Mocked<Counter<string>>;

  beforeEach(() => {
    requestDuration = {
      observe: jest.fn(),
    } as unknown as jest.Mocked<Histogram<string>>;

    requestsTotal = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

    errorsTotal = {
      inc: jest.fn(),
    } as unknown as jest.Mocked<Counter<string>>;

    middleware = new MetricsMiddleware(
      requestDuration,
      requestsTotal,
      errorsTotal,
    );
  });

  const createResponse = (statusCode: number): Response => {
    const response = new EventEmitter() as Response;
    response.statusCode = statusCode;
    return response;
  };

  const runMiddleware = (
    req: Partial<Request>,
    res: Response,
    next: NextFunction = jest.fn(),
  ): void => {
    middleware.use(req as Request, res, next);
    res.emit('finish');
  };

  it('records duration and request count on response finish', () => {
    const req: Partial<Request> = {
      method: 'GET',
      path: '/sample',
      baseUrl: '',
      route: { path: '/sample' },
    };
    const res = createResponse(200);

    runMiddleware(req, res);

    expect(requestDuration.observe).toHaveBeenCalledWith(
      {
        method: 'GET',
        route: '/sample',
        status_code: '200',
      },
      expect.any(Number),
    );
    expect(requestsTotal.inc).toHaveBeenCalledWith({
      method: 'GET',
      route: '/sample',
      status_code: '200',
    });
    expect(errorsTotal.inc).not.toHaveBeenCalled();
  });

  it('records 4xx errors with status_class label', () => {
    const req: Partial<Request> = {
      method: 'GET',
      path: '/missing',
      baseUrl: '',
      route: { path: '/missing' },
    };
    const res = createResponse(404);

    runMiddleware(req, res);

    expect(errorsTotal.inc).toHaveBeenCalledWith({
      method: 'GET',
      route: '/missing',
      status_class: '4xx',
    });
  });

  it('records 5xx errors with status_class label', () => {
    const req: Partial<Request> = {
      method: 'POST',
      path: '/fail',
      baseUrl: '',
      route: { path: '/fail' },
    };
    const res = createResponse(500);

    runMiddleware(req, res);

    expect(errorsTotal.inc).toHaveBeenCalledWith({
      method: 'POST',
      route: '/fail',
      status_class: '5xx',
    });
  });

  it('skips metrics collection for GET /metrics', () => {
    const req: Partial<Request> = {
      method: 'GET',
      path: '/metrics',
    };
    const res = createResponse(200);
    const next = jest.fn();

    middleware.use(req as Request, res, next);
    res.emit('finish');

    expect(next).toHaveBeenCalled();
    expect(requestDuration.observe).not.toHaveBeenCalled();
    expect(requestsTotal.inc).not.toHaveBeenCalled();
    expect(errorsTotal.inc).not.toHaveBeenCalled();
  });

  it('skips metrics collection for GET /health/live', () => {
    const req: Partial<Request> = {
      method: 'GET',
      path: '/health/live',
    };
    const res = createResponse(204);
    const next = jest.fn();

    middleware.use(req as Request, res, next);
    res.emit('finish');

    expect(next).toHaveBeenCalled();
    expect(requestDuration.observe).not.toHaveBeenCalled();
    expect(requestsTotal.inc).not.toHaveBeenCalled();
    expect(errorsTotal.inc).not.toHaveBeenCalled();
  });
});
