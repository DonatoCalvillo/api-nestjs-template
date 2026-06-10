import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

const API_VERSION_HEADER = 'x-api-version';
const API_VERSION = '0.0.0';

@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    req[API_VERSION_HEADER] = API_VERSION;
    res.setHeader(API_VERSION_HEADER, API_VERSION);
    next();
  }
}
