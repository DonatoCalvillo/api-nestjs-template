import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
const API_VERSION_HEADER = 'x-api-version';
const API_VERSION = '0.0.0';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const id: string = randomUUID();
    req[REQUEST_ID_HEADER] = id;
    req[API_VERSION_HEADER] = API_VERSION;
    res.setHeader(REQUEST_ID_HEADER, id);
    res.setHeader(API_VERSION_HEADER, API_VERSION);
    next();
  }
}
