export enum OutboxMessageStatus {
  Pending = 'pending',
  Processing = 'processing',
  Published = 'published',
  Failed = 'failed',
}
