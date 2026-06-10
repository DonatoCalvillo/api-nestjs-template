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

export type SaveUserContext = {
  passwordHash?: string;
  roleNames?: string[];
};

export interface IUserRepository {
  findByEmail(email: string): Promise<UserAuthData | null>;
  findByIdWithRolesAndPermissions(
    id: string,
  ): Promise<AuthenticatedUser | null>;
  existsByEmail(email: string): Promise<boolean>;
  findAuthDataById(id: string): Promise<UserAuthData | null>;
  markEmailVerified(userId: string, trx?: QueryRunner): Promise<void>;
  updatePasswordHash(
    userId: string,
    passwordHash: string,
    trx?: QueryRunner,
  ): Promise<void>;
  setMfaPendingSecret(
    userId: string,
    encryptedSecret: string,
    trx?: QueryRunner,
  ): Promise<void>;
  enableMfa(
    userId: string,
    encryptedSecret: string,
    trx?: QueryRunner,
  ): Promise<void>;
  create(params: CreateUserParams, trx?: QueryRunner): Promise<User>;
  findRoleIdsByNames(names: string[], trx?: QueryRunner): Promise<string[]>;
  findById(id: string, options?: FindByIdOptions): Promise<User | null>;
  save(user: User, trx?: QueryRunner, context?: SaveUserContext): Promise<User>;
  deleteById(id: string, trx?: QueryRunner): Promise<void>;
  findMany(options?: QueryOptions<UserEntity>): Promise<PaginatedResult<User>>;
}
