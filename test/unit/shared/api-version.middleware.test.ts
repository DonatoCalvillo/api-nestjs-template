import { ApiVersionMiddleware } from '../../../src/modules/shared/infrastructure/middlewares/api-version.middleware';
import {
  API_VERSION,
  API_VERSION_HEADER,
} from '../../../src/configuration/api.constants';

describe('ApiVersionMiddleware', () => {
  const middleware = new ApiVersionMiddleware();

  it('sets x-api-version on request and response', () => {
    const req = {} as Record<string, string>;
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    middleware.use(req as never, res as never, next);

    expect(req[API_VERSION_HEADER]).toBe(API_VERSION);
    expect(res.setHeader).toHaveBeenCalledWith(API_VERSION_HEADER, API_VERSION);
    expect(next).toHaveBeenCalled();
  });
});
