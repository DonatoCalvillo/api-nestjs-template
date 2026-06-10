import { RefreshTokenEntity } from '../modules/auth/infrastructure/persistence/refresh-token.entity';
import { AuditLogEntity } from '../modules/shared/infrastructure/audit/audit-log.entity';
import { IdempotencyKeyEntity } from '../modules/shared/infrastructure/idempotency/idempotency-key.entity';
import { OutboxMessageEntity } from '../modules/shared/infrastructure/outbox/outbox-message.entity';
import { PermissionEntity } from '../modules/users/infrastructure/persistence/permission.entity';
import { RoleEntity } from '../modules/users/infrastructure/persistence/role.entity';
import { UserEntity } from '../modules/users/infrastructure/persistence/user.entity';

export const entities = [
  UserEntity,
  RoleEntity,
  PermissionEntity,
  RefreshTokenEntity,
  OutboxMessageEntity,
  IdempotencyKeyEntity,
  AuditLogEntity,
];
