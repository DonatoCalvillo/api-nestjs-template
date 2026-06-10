import { sanitizeForLogging } from '../../../src/modules/shared/infrastructure/logging/sanitize-for-logging.util';
import { SENSITIVE_LOG_FIELDS } from '../../../src/modules/shared/infrastructure/logging/sensitive-fields.constants';
import { sanitizeAuditState } from '../../../src/modules/shared/application/audit/utils/audit-sanitize.util';

describe('sanitizeForLogging', () => {
  it('redacts secrets and PII recursively for HTTP logs', () => {
    const input = {
      email: 'alice@example.com',
      refreshToken: 'rt-secret',
      profile: {
        name: 'Alice',
        city: 'Madrid',
      },
    };

    expect(sanitizeForLogging(input, SENSITIVE_LOG_FIELDS)).toEqual({
      email: '***REDACTED***',
      refreshToken: '***REDACTED***',
      profile: {
        name: '***REDACTED***',
        city: 'Madrid',
      },
    });
  });
});

describe('sanitizeAuditState', () => {
  it('redacts secrets but keeps email for audit compliance', () => {
    const input = {
      email: 'alice@example.com',
      password: 'secret123',
      refreshToken: 'rt-secret',
      profile: {
        token: 'abc',
        city: 'Madrid',
      },
    };

    expect(sanitizeAuditState(input)).toEqual({
      email: 'alice@example.com',
      password: '***REDACTED***',
      refreshToken: '***REDACTED***',
      profile: {
        token: '***REDACTED***',
        city: 'Madrid',
      },
    });
  });
});
