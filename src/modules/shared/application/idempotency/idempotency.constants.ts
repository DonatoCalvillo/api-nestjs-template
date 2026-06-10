export const IDEMPOTENCY_REPOSITORY = Symbol('IDEMPOTENCY_REPOSITORY');

export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
export const IDEMPOTENCY_REPLAYED_HEADER = 'idempotency-replayed';

export const SKIP_IDEMPOTENCY_KEY = 'skipIdempotency';

export const IDEMPOTENT_HTTP_METHODS = ['POST', 'PUT', 'PATCH'] as const;
