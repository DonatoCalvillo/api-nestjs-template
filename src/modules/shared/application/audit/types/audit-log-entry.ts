export type AuditChange = Record<string, { from: unknown; to: unknown }>;

export type AuditLogEntry = {
  actorId: string | null;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  changes: AuditChange | null;
  requestId: string | null;
  traceId: string | null;
  ipAddress: string | null;
  useCaseName: string;
};
