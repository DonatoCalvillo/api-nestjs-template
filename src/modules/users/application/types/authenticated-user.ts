export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
};

export type UserAuthData = AuthenticatedUser & {
  passwordHash: string;
};
