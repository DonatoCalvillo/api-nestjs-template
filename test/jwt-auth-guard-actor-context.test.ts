import { ClsService } from 'nestjs-cls';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../src/modules/auth/infrastructure/guards/jwt-auth.guard';
import { ActorContextService } from '../src/modules/shared/infrastructure/audit/actor-context.service';
import { CLS_ACTOR } from '../src/modules/shared/infrastructure/audit/actor-context.constants';

describe('JwtAuthGuard actor context integration', () => {
  it('persists authenticated actor in CLS store', () => {
    const store = new Map<string, unknown>();
    const cls = {
      get: jest.fn((key: string) => store.get(key)),
      set: jest.fn((key: string, value: unknown) => {
        store.set(key, value);
      }),
    } as unknown as ClsService;

    const actorContext = new ActorContextService(cls);
    const guard = new JwtAuthGuard({} as Reflector, actorContext);

    guard.handleRequest(null, {
      id: 'user-42',
      email: 'alice@example.com',
      name: 'Alice',
      roles: ['user'],
      permissions: ['users:read'],
    });

    expect(cls.set).toHaveBeenCalledWith(CLS_ACTOR, {
      actorId: 'user-42',
      actorType: 'user',
      displayName: 'alice@example.com',
    });
    expect(actorContext.getActor()).toEqual({
      actorId: 'user-42',
      actorType: 'user',
      displayName: 'alice@example.com',
    });
  });
});
