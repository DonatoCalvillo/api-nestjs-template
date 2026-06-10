import { AuthenticatedUser } from '../modules/users/application/types/authenticated-user';

declare global {
  namespace Express {
    type User = AuthenticatedUser;
  }
}

export {};
