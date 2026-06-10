import { Reflector } from '@nestjs/core';
import { AuditLog } from '../../../src/modules/shared/application/audit/audit-log.decorator';
import { AuditLogService } from '../../../src/modules/shared/application/audit/audit-log.service';
import { IAuditLogRepository } from '../../../src/modules/shared/application/audit/ports/audit-log.repository.port';
import { ActorContextService } from '../../../src/modules/shared/infrastructure/audit/actor-context.service';
import { NoOpBusinessMetricsService } from '../../../src/modules/shared/infrastructure/metrics/noop-business-metrics.service';
import { TraceContextService } from '../../../src/modules/shared/infrastructure/tracing/trace-context.service';

@AuditLog({
  action: 'user.update',
  entityType: 'User',
  entityId: (cmd: { id: string }) => cmd.id,
  getBeforeState: async (cmd) => ({ id: cmd.id, name: 'Before' }),
})
class AuditedUseCase {}

class PlainUseCase {}

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: jest.Mocked<IAuditLogRepository>;
  let actorContext: jest.Mocked<ActorContextService>;
  let traceContext: jest.Mocked<TraceContextService>;

  beforeEach(() => {
    repository = {
      save: jest.fn().mockResolvedValue(undefined),
    };

    actorContext = {
      getActor: jest.fn().mockReturnValue({
        actorId: 'user-1',
        actorType: 'user',
        displayName: 'alice@example.com',
      }),
      getRequestId: jest.fn().mockReturnValue('req-123'),
      getIpAddress: jest.fn().mockReturnValue('127.0.0.1'),
    } as unknown as jest.Mocked<ActorContextService>;

    traceContext = {
      getTraceId: jest.fn().mockReturnValue('trace-456'),
    } as unknown as jest.Mocked<TraceContextService>;

    service = new AuditLogService(
      new Reflector(),
      repository,
      actorContext,
      traceContext,
      new NoOpBusinessMetricsService(),
    );
  });

  it('skips audit when use case has no metadata', async () => {
    const useCase = new PlainUseCase();
    const execute = jest.fn().mockResolvedValue({ ok: true });

    const result = await service.wrap(
      useCase as never,
      { id: '1' },
      undefined,
      execute,
    );

    expect(result).toEqual({ ok: true });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('persists before/after state and changes on success', async () => {
    const useCase = new AuditedUseCase();
    const execute = jest
      .fn()
      .mockResolvedValue({ id: '1', name: 'After', password: 'secret' });

    await service.wrap(useCase as never, { id: '1' }, undefined, execute);

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-1',
        actorType: 'user',
        action: 'user.update',
        entityType: 'User',
        entityId: '1',
        requestId: 'req-123',
        traceId: 'trace-456',
        ipAddress: '127.0.0.1',
        useCaseName: 'AuditedUseCase',
        beforeState: { id: '1', name: 'Before' },
        afterState: {
          id: '1',
          name: 'After',
          password: '***REDACTED***',
        },
        changes: {
          name: { from: 'Before', to: 'After' },
          password: { from: null, to: '***REDACTED***' },
        },
      }),
      undefined,
    );
  });

  it('passes transaction to repository when provided', async () => {
    const useCase = new AuditedUseCase();
    const trx = { manager: {} } as never;
    const execute = jest.fn().mockResolvedValue({ id: '1', name: 'After' });

    await service.wrap(useCase as never, { id: '1' }, { trx }, execute);

    expect(repository.save).toHaveBeenCalledWith(expect.any(Object), trx);
  });

  it('does not persist when execute throws', async () => {
    const useCase = new AuditedUseCase();
    const execute = jest.fn().mockRejectedValue(new Error('command failed'));

    await expect(
      service.wrap(useCase as never, { id: '1' }, undefined, execute),
    ).rejects.toThrow('command failed');

    expect(repository.save).not.toHaveBeenCalled();
  });
});
