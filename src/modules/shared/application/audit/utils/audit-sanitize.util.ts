import { sanitizeForLogging } from '../../../infrastructure/logging/sanitize-for-logging.util';
import { SENSITIVE_AUDIT_FIELDS } from '../audit-log.constants';

export { sanitizeForLogging } from '../../../infrastructure/logging/sanitize-for-logging.util';

export function sanitizeAuditState(value: unknown): unknown {
  return sanitizeForLogging(value, SENSITIVE_AUDIT_FIELDS);
}
