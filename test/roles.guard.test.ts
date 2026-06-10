import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/modules/auth/infrastructure/guards/roles.guard';
import { ROLES_KEY } from '../src/modules/auth/infrastructure/constants/auth-metadata.constants';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createContext = (user?: {
    roles: string[];
    permissions: string[];
  }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows access when user has required role', () => {
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === ROLES_KEY ? ['admin'] : undefined,
    );

    expect(
      guard.canActivate(createContext({ roles: ['admin'], permissions: [] })),
    ).toBe(true);
  });

  it('denies access when user lacks required role', () => {
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === ROLES_KEY ? ['admin'] : undefined,
    );

    try {
      guard.canActivate(createContext({ roles: ['user'], permissions: [] }));
      fail('Expected canActivate to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect((error as HttpException).getResponse()).toEqual(
        expect.objectContaining({
          success: false,
          code: 'E-AUTH-005',
        }),
      );
    }
  });
});
