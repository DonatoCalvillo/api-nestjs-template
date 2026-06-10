import { QueryRunner } from 'typeorm';
import {
  FindByIdOptions,
  PaginatedResult,
  QueryOptions,
} from '../../../shared/domain/repositories';
import { User } from '../../domain/models/user.model';
import { AuthenticatedUser, UserAuthData } from '../types/authenticated-user';
import { UserEntity } from '../../infrastructure/persistence/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export type CreateUserParams = {
  email: string;
  name: string;
  passwordHash: string;
  roleNames: string[];
};

export interface IUserRepository {
  findByEmail(email: string): Promise<UserAuthData | null>;
  findByIdWithRolesAndPermissions(
    id: string,
  ): Promise<AuthenticatedUser | null>;
  existsByEmail(email: string): Promise<boolean>;
  create(params: CreateUserParams, trx?: QueryRunner): Promise<User>;
  findRoleIdsByNames(names: string[], trx?: QueryRunner): Promise<string[]>;
  findById(id: string, options?: FindByIdOptions): Promise<User | null>;
  save(user: User, trx?: QueryRunner): Promise<User>;
  findMany(options?: QueryOptions<UserEntity>): Promise<PaginatedResult<User>>;
}
