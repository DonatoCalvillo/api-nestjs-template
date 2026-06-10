import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/infrastructure/persistence';
import { AuthTokenType } from '../../domain/constants/auth-token.constants';

@Entity('auth_tokens')
export class AuthTokenEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column()
  type: AuthTokenType;

  @Column({ name: 'token_hash' })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt: Date | null;
}
