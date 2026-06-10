export const HTTP_REQUEST_DURATION_SECONDS = 'http_request_duration_seconds';
export const HTTP_REQUESTS_TOTAL = 'http_requests_total';
export const HTTP_ERRORS_TOTAL = 'http_errors_total';

export const OUTBOX_MESSAGES_PENDING = 'outbox_messages_pending';
export const OUTBOX_MESSAGES_PUBLISHED_TOTAL =
  'outbox_messages_published_total';
export const OUTBOX_MESSAGES_FAILED_TOTAL = 'outbox_messages_failed_total';
export const AUDIT_LOG_WRITES_TOTAL = 'audit_log_writes_total';
export const AUDIT_LOG_WRITE_ERRORS_TOTAL = 'audit_log_write_errors_total';
export const CIRCUIT_BREAKER_STATE = 'circuit_breaker_state';
export const CIRCUIT_BREAKER_OPENED_TOTAL = 'circuit_breaker_opened_total';

export const CIRCUIT_BREAKER_CLOSED = 0;
export const CIRCUIT_BREAKER_OPEN = 1;

export const HTTP_DURATION_BUCKETS = [
  0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
];

export const METRICS_PATH = '/metrics';
export const HEALTH_PATH = '/health';
export const HEALTH_LIVE_PATH = '/health/live';
export const HEALTH_READY_PATH = '/health/ready';

export const isHealthProbePath = (path: string): boolean =>
  path === HEALTH_PATH ||
  path === HEALTH_LIVE_PATH ||
  path === HEALTH_READY_PATH;
