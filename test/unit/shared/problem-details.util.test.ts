import { ResponseDto } from '../../../src/modules/shared/domain/response/response';
import {
  acceptsProblemDetails,
  toProblemDetails,
} from '../../../src/modules/shared/infrastructure/response/problem-details.util';

describe('problem-details.util', () => {
  it('detects application/problem+json accept header', () => {
    expect(acceptsProblemDetails('application/problem+json')).toBe(true);
    expect(acceptsProblemDetails('application/json')).toBe(false);
    expect(
      acceptsProblemDetails('application/json, application/problem+json'),
    ).toBe(true);
  });

  it('maps ResponseDto to RFC 7807 problem details', () => {
    const dto = ResponseDto.error('Invalid email or password', 'E-AUTH-001');
    const problem = toProblemDetails(
      dto,
      401,
      '/api/v1/auth/login',
      'trace-1',
      'req-1',
    );

    expect(problem.status).toBe(401);
    expect(problem.code).toBe('E-AUTH-001');
    expect(problem.instance).toBe('/api/v1/auth/login');
    expect(problem.traceId).toBe('trace-1');
    expect(problem.type).toContain('E-AUTH-001');
  });
});
