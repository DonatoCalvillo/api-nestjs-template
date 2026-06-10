export const RBAC_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export const RBAC_PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  FILES_WRITE: 'files:write',
} as const;

export const SEED_PERMISSIONS = Object.values(RBAC_PERMISSIONS);

export const ROLE_PERMISSIONS: Record<
  (typeof RBAC_ROLES)[keyof typeof RBAC_ROLES],
  readonly string[]
> = {
  [RBAC_ROLES.USER]: [RBAC_PERMISSIONS.USERS_READ],
  [RBAC_ROLES.ADMIN]: SEED_PERMISSIONS,
};

export const DEFAULT_REGISTRATION_ROLE = RBAC_ROLES.USER;

export const SEED_ROLES = Object.values(RBAC_ROLES);
