import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';

export const REQUEST_ID_HEADER = 'x-request-id';

export function genRequestId(req: IncomingMessage): string {
  const incoming = req.headers[REQUEST_ID_HEADER];

  if (typeof incoming === 'string' && incoming.trim()) {
    return incoming.trim();
  }

  if (Array.isArray(incoming) && incoming[0]?.trim()) {
    return incoming[0].trim();
  }

  return randomUUID();
}
