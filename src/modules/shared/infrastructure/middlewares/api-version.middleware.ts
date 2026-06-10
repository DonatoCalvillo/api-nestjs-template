import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import {
  API_VERSION,
  API_VERSION_HEADER,
} from '../../../../configuration/api.constants';

@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    req[API_VERSION_HEADER] = API_VERSION;
    res.setHeader(API_VERSION_HEADER, API_VERSION);
    next();
  }
}
