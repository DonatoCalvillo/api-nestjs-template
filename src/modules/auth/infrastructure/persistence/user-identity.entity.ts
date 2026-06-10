import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/infrastructure/persistence';

@Entity('user_identities')
export class UserIdentityEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column()
  provider: string;

  @Column({ name: 'provider_sub' })
  providerSub: string;

  @Column({ nullable: true })
  email: string | null;
}
