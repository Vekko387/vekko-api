import type { AuthenticatedUser } from '../../modules/auth/types/authenticated-user';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
