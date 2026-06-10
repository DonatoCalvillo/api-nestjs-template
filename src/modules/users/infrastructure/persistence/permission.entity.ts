import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/infrastructure/persistence';

@Entity('permissions')
export class PermissionEntity extends BaseEntity {
  @Column({ unique: true })
  name: string;
}
