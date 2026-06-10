import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { genRequestId, REQUEST_ID_HEADER } from '../request-context';
import { ActorContextService } from './actor-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly actorContext: ActorContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId =
      (req[REQUEST_ID_HEADER] as string | undefined) ?? genRequestId(req);
    const ipAddress = req.ip ?? req.socket.remoteAddress ?? undefined;

    this.actorContext.setRequestId(requestId);
    this.actorContext.setIpAddress(ipAddress);

    next();
  }
}
