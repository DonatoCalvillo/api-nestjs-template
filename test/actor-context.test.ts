import { ClsService } from 'nestjs-cls';
import { ANONYMOUS_ACTOR } from '../src/modules/shared/application/audit/types/actor-snapshot';
import {
  CLS_ACTOR,
  CLS_IP_ADDRESS,
  CLS_REQUEST_ID,
} from '../src/modules/shared/infrastructure/audit/actor-context.constants';
import { ActorContextService } from '../src/modules/shared/infrastructure/audit/actor-context.service';

describe('ActorContextService', () => {
  let cls: jest.Mocked<ClsService>;
  let service: ActorContextService;
  const store = new Map<string, unknown>();

  beforeEach(() => {
    store.clear();

    cls = {
      get: jest.fn((key: string) => store.get(key)),
      set: jest.fn((key: string, value: unknown) => {
        store.set(key, value);
      }),
    } as unknown as jest.Mocked<ClsService>;

    service = new ActorContextService(cls);
  });

  it('returns anonymous actor by default', () => {
    expect(service.getActor()).toEqual(ANONYMOUS_ACTOR);
  });

  it('stores and retrieves actor snapshot', () => {
    const actor = {
      actorId: 'user-42',
      actorType: 'user' as const,
      displayName: 'alice@example.com',
    };

    service.setActor(actor);

    expect(service.getActor()).toEqual(actor);
    expect(cls.set).toHaveBeenCalledWith(CLS_ACTOR, actor);
  });

  it('stores request id and ip address', () => {
    service.setRequestId('req-abc');
    service.setIpAddress('10.0.0.1');

    expect(service.getRequestId()).toBe('req-abc');
    expect(service.getIpAddress()).toBe('10.0.0.1');
    expect(cls.set).toHaveBeenCalledWith(CLS_REQUEST_ID, 'req-abc');
    expect(cls.set).toHaveBeenCalledWith(CLS_IP_ADDRESS, '10.0.0.1');
  });

  it('ignores empty ip address', () => {
    service.setIpAddress(undefined);

    expect(service.getIpAddress()).toBeUndefined();
    expect(cls.set).not.toHaveBeenCalledWith(CLS_IP_ADDRESS, expect.anything());
  });
});
