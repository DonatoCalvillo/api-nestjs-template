import { isHealthProbePath, METRICS_PATH } from '../metrics/metrics.constants';

const SWAGGER_PATH_PREFIX = '/api/docs';

export const isExcludedResponsePath = (path: string): boolean => {
  if (isHealthProbePath(path) || path === METRICS_PATH) {
    return true;
  }

  return (
    path === SWAGGER_PATH_PREFIX || path.startsWith(`${SWAGGER_PATH_PREFIX}/`)
  );
};
