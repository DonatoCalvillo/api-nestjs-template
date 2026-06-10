import { SetMetadata } from '@nestjs/common';
import { AUDIT_LOG_KEY } from './audit-log.constants';
import { AuditLogOptions } from './audit-log.options';

export function AuditLog<TCommand = unknown, TResult = unknown>(
  options: AuditLogOptions<TCommand, TResult>,
): ClassDecorator {
  return SetMetadata(AUDIT_LOG_KEY, options);
}
