import { DeleteDateColumn } from 'typeorm';
import { BaseEntity } from './entity.base';

export abstract class SoftDeletableEntity extends BaseEntity {
  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
