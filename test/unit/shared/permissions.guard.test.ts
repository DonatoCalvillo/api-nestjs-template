import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../../../src/modules/auth/infrastructure/guards/permissions.guard';
import { PERMISSIONS_KEY } from '../../../src/modules/auth/infrastructure/constants/auth-metadata.constants';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;

  const createContext = (user?: {
    id: string;
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

    guard = new PermissionsGuard(reflector);
  });

  it('allows access when no permissions are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows access when user has required permissions', () => {
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === PERMISSIONS_KEY ? ['users:read'] : undefined,
    );

    expect(
      guard.canActivate(
        createContext({
          id: 'user-1',
          roles: ['user'],
          permissions: ['users:read'],
        }),
      ),
    ).toBe(true);
  });

  it('denies access when user is missing', () => {
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === PERMISSIONS_KEY ? ['users:read'] : undefined,
    );

    try {
      guard.canActivate(createContext());
      fail('Expected canActivate to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
    }
  });

  it('denies access when user lacks required permission', () => {
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === PERMISSIONS_KEY ? ['users:write'] : undefined,
    );

    try {
      guard.canActivate(
        createContext({
          id: 'user-1',
          roles: ['user'],
          permissions: ['users:read'],
        }),
      );
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
