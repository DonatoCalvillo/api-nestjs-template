import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../src/modules/auth/infrastructure/constants/auth-metadata.constants';
import { ActorContextService } from '../src/modules/shared/infrastructure/audit/actor-context.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let actorContext: jest.Mocked<ActorContextService>;

  const createContext = (
    path = '/protected',
    method = 'GET',
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ path, method }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    actorContext = {
      setActor: jest.fn(),
    } as unknown as jest.Mocked<ActorContextService>;

    guard = new JwtAuthGuard(reflector, actorContext);
  });

  it('allows public routes via metadata', () => {
    reflector.getAllAndOverride.mockImplementation((key) =>
      key === IS_PUBLIC_KEY ? true : undefined,
    );

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows health probe paths without metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext('/healthy', 'GET'))).toBe(true);
  });

  it('sets actor when user is authenticated', () => {
    const user = {
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
      roles: ['user'],
      permissions: ['users:read'],
    };

    const result = guard.handleRequest(null, user);

    expect(result).toEqual(user);
    expect(actorContext.setActor).toHaveBeenCalledWith({
      actorId: 'user-1',
      actorType: 'user',
      displayName: 'alice@example.com',
    });
  });

  it('throws when user is missing', () => {
    try {
      guard.handleRequest(null, false);
      fail('Expected handleRequest to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.UNAUTHORIZED,
      );
      expect((error as HttpException).getResponse()).toEqual(
        expect.objectContaining({
          success: false,
          code: 'E-AUTH-004',
        }),
      );
    }
  });
});
