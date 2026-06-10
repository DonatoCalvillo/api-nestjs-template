import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { genRequestId, REQUEST_ID_HEADER } from '../request-context';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const id = genRequestId(req);
    req[REQUEST_ID_HEADER] = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  }
}
