import { RefreshTokenEntity } from '../modules/auth/infrastructure/persistence/refresh-token.entity';
import { AuthTokenEntity } from '../modules/auth/infrastructure/persistence/auth-token.entity';
import { ApiKeyEntity } from '../modules/auth/infrastructure/persistence/api-key.entity';
import { UserIdentityEntity } from '../modules/auth/infrastructure/persistence/user-identity.entity';
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
  AuthTokenEntity,
  UserIdentityEntity,
  ApiKeyEntity,
  OutboxMessageEntity,
  IdempotencyKeyEntity,
  AuditLogEntity,
];
