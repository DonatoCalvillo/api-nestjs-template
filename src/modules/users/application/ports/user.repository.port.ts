import { QueryRunner } from 'typeorm';
import { User } from '../../domain/models/user.model';
import { AuthenticatedUser, UserAuthData } from '../types/authenticated-user';

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
}
