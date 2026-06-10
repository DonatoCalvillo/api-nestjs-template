import helmet from 'helmet';
import { ENVIRONMENT_VARIABLES } from './environments-variables';

export const getHelmetMiddleware = () =>
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: { action: 'deny' },
    strictTransportSecurity:
      ENVIRONMENT_VARIABLES.NODE_ENV === 'production'
        ? { maxAge: 31536000, includeSubDomains: true }
        : false,
  });
