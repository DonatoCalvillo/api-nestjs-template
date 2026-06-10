export const isClientIpAllowed = (
  clientIp: string | undefined,
  allowlist: readonly string[],
): boolean => Boolean(clientIp && allowlist.includes(clientIp));
