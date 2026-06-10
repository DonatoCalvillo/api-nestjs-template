import {
  computeAuditDiff,
  toAuditRecord,
} from '../src/modules/shared/application/audit/utils/audit-diff.util';
import { sanitizeAuditState } from '../src/modules/shared/application/audit/utils/audit-sanitize.util';

describe('audit-diff.util', () => {
  describe('computeAuditDiff', () => {
    it('returns null when states are equal', () => {
      const state = { name: 'Alice', email: 'alice@example.com' };

      expect(computeAuditDiff(state, { ...state })).toBeNull();
    });

    it('detects top-level field changes', () => {
      const before = { name: 'Alice', email: 'alice@example.com' };
      const after = { name: 'Alice', email: 'alice.new@example.com' };

      expect(computeAuditDiff(before, after)).toEqual({
        email: {
          from: 'alice@example.com',
          to: 'alice.new@example.com',
        },
      });
    });

    it('detects nested field changes with dot notation', () => {
      const before = { profile: { city: 'Madrid', country: 'ES' } };
      const after = { profile: { city: 'Barcelona', country: 'ES' } };

      expect(computeAuditDiff(before, after)).toEqual({
        'profile.city': {
          from: 'Madrid',
          to: 'Barcelona',
        },
      });
    });

    it('handles create operations with null before state', () => {
      const after = { name: 'Alice', email: 'alice@example.com' };

      expect(computeAuditDiff(null, after)).toEqual({
        name: { from: null, to: 'Alice' },
        email: { from: null, to: 'alice@example.com' },
      });
    });

    it('handles delete operations with null after state', () => {
      const before = { name: 'Alice', email: 'alice@example.com' };

      expect(computeAuditDiff(before, null)).toEqual({
        name: { from: 'Alice', to: null },
        email: { from: 'alice@example.com', to: null },
      });
    });
  });

  describe('toAuditRecord', () => {
    it('serializes class-like objects to plain records', () => {
      expect(toAuditRecord({ id: '1', name: 'Alice' })).toEqual({
        id: '1',
        name: 'Alice',
      });
    });
  });
});

describe('audit-sanitize.util', () => {
  it('redacts sensitive fields recursively', () => {
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
