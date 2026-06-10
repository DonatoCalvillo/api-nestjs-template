import { toPaginatedResponse } from '../../../src/modules/shared/infrastructure/dtos/paginated-response.dto';

describe('toPaginatedResponse', () => {
  it('builds paginated metadata from items and query params', () => {
    const result = toPaginatedResponse(['a', 'b'], 25, 2, 10);

    expect(result).toEqual({
      items: ['a', 'b'],
      total: 25,
      page: 2,
      perPage: 10,
      totalPages: 3,
    });
  });

  it('returns zero totalPages when perPage is zero', () => {
    const result = toPaginatedResponse([], 10, 1, 0);

    expect(result.totalPages).toBe(0);
  });
});
