import { SetMetadata } from '@nestjs/common';
import { SKIP_IDEMPOTENCY_KEY } from '../../application/idempotency/idempotency.constants';

export const SkipIdempotency = () => SetMetadata(SKIP_IDEMPOTENCY_KEY, true);
