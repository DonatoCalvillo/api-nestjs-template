import { HttpStatus } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { InvalidCredentialsError } from '../src/modules/auth/domain/errors/auth.errors';
import { Result } from '../src/modules/shared/application';
import { BaseController } from '../src/modules/shared/infrastructure/controllers/base.controller';
import { ActorContextService } from '../src/modules/shared/infrastructure/audit/actor-context.service';
import { TraceContextService } from '../src/modules/shared/infrastructure/tracing/trace-context.service';

class TestController extends BaseController {
  handleFailure() {
    return this.handleResult(Result.fail(new InvalidCredentialsError()));
  }
}

describe('BaseController', () => {
  let controller: TestController;
  let logger: jest.Mocked<PinoLogger>;
  let actorContext: jest.Mocked<ActorContextService>;
  let traceContext: jest.Mocked<TraceContextService>;

  beforeEach(() => {
    logger = {
      setContext: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;

    actorContext = {
      getRequestId: jest.fn().mockReturnValue('req-abc'),
    } as unknown as jest.Mocked<ActorContextService>;

    traceContext = {
      getTraceId: jest.fn().mockReturnValue('trace-abc'),
      getSpanId: jest.fn().mockReturnValue('span-abc'),
    } as unknown as jest.Mocked<TraceContextService>;

    controller = new TestController(logger, actorContext, traceContext);
  });

  it('logs structured domain failures before throwing', () => {
    expect(() => controller.handleFailure()).toThrow();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'domain_failure',
        errorCode: 'E-AUTH-001',
        httpStatus: HttpStatus.UNAUTHORIZED,
        requestId: 'req-abc',
        traceId: 'trace-abc',
        spanId: 'span-abc',
        err: expect.any(InvalidCredentialsError),
      }),
      'TestController received domain failure',
    );
  });
});
