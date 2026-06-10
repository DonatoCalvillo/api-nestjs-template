import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/infrastructure/persistence';

@Entity('api_keys')
export class ApiKeyEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'key_prefix' })
  keyPrefix: string;

  @Column({ name: 'key_hash' })
  keyHash: string;

  @Column('text', { array: true, default: '{}' })
  scopes: string[];

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;
}
