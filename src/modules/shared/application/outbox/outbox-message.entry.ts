import { OutboxMessageStatus } from './outbox-message.status';

export type OutboxMessageEntry = {
  eventName: string;
  aggregateType: string | null;
  aggregateId: string | null;
  payload: Record<string, unknown>;
  status: OutboxMessageStatus;
};
