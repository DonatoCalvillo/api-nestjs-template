import { IdempotencyKeyStatus } from '../idempotency-key.status';

export interface IdempotencyRecord {
  id: string;
  scope: string;
  idempotencyKey: string;
  requestMethod: string;
  requestPath: string;
  requestHash: string;
  responseStatus: number | null;
  responseBody: unknown;
  status: IdempotencyKeyStatus;
  expiresAt: Date;
  createdAt: Date;
}

export interface IdempotencyClaimInput {
  scope: string;
  idempotencyKey: string;
  requestMethod: string;
  requestPath: string;
  requestHash: string;
  expiresAt: Date;
}

export type IdempotencyClaimResult =
  | { type: 'claimed' }
  | { type: 'replay'; record: IdempotencyRecord }
  | { type: 'hash_mismatch' }
  | { type: 'in_progress' };

export interface IdempotencyCompleteInput {
  scope: string;
  idempotencyKey: string;
  responseStatus: number;
  responseBody: unknown;
}

export interface IIdempotencyRepository {
  claim(input: IdempotencyClaimInput): Promise<IdempotencyClaimResult>;
  complete(input: IdempotencyCompleteInput): Promise<void>;
  deleteInProgress(scope: string, idempotencyKey: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
