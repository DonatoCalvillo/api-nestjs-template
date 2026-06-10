import { Request } from 'express';
import { AuthenticatedUser } from '../../../users/application/types/authenticated-user';

export const resolveIdempotencyScope = (request: Request): string => {
  const user = (request as Request & { user?: AuthenticatedUser }).user;

  if (user?.id) {
    return `user:${user.id}`;
  }

  return 'anonymous';
};
