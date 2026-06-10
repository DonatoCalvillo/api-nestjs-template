import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import {
  isHealthProbePath,
  METRICS_PATH,
} from '../../../shared/infrastructure/metrics/metrics.constants';

const SWAGGER_PATH_PREFIXES = ['/api/docs', '/api/docs-json'];

export const isPublicPath = (method: string, path: string): boolean => {
  if (method === 'GET' && (isHealthProbePath(path) || path === METRICS_PATH)) {
    return true;
  }

  if (!ENVIRONMENT_VARIABLES.SWAGGER_ENABLED) {
    return false;
  }

  return SWAGGER_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
};
