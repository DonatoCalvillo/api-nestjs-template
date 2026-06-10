export const RBAC_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export const DEFAULT_REGISTRATION_ROLE = RBAC_ROLES.USER;

export const SEED_ROLES = Object.values(RBAC_ROLES);
