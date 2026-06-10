export const AUTH_TOKEN_TYPES = {
  EMAIL_VERIFY: 'email_verify',
  PASSWORD_RESET: 'password_reset',
} as const;

export type AuthTokenType =
  (typeof AUTH_TOKEN_TYPES)[keyof typeof AUTH_TOKEN_TYPES];
