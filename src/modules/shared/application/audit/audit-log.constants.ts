export const AUDIT_LOG_KEY = 'audit_log';

export const AUDIT_LOG_SERVICE = Symbol('AUDIT_LOG_SERVICE');

import { SENSITIVE_SECRET_FIELDS } from '../../infrastructure/logging/sensitive-fields.constants';

export const SENSITIVE_AUDIT_FIELDS = SENSITIVE_SECRET_FIELDS;
