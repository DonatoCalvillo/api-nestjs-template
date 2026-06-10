import { Injectable } from '@nestjs/common';
import { DataSource, In, QueryRunner } from 'typeorm';
import {
  PaginatedResult,
  QueryOptions,
} from '../../../shared/domain/repositories';
import { TypeOrmBaseRepository } from '../../../shared/infrastructure/persistence';
import {
  CreateUserParams,
  IUserRepository,
} from '../../application/ports/user.repository.port';
import { User } from '../../domain/models/user.model';
import {
  AuthenticatedUser,
  UserAuthData,
} from '../../application/types/authenticated-user';
import { UserMapper } from '../mappers/user.mapper';
import { RoleEntity } from './role.entity';
import { UserEntity } from './user.entity';

@Injectable()
export class TypeOrmUserRepository
  extends TypeOrmBaseRepository<User, UserEntity>
  implements IUserRepository
{
  constructor(mapper: UserMapper, dataSource: DataSource) {
    super(mapper, dataSource, TypeOrmUserRepository.name);
  }

  protected entityClass(): new () => UserEntity {
    return UserEntity;
  }

  private getUserRepo(trx?: QueryRunner) {
    return this.getRepoForTrx(trx);
  }

  private getRoleRepo(trx?: QueryRunner) {
    return trx
      ? trx.manager.getRepository(RoleEntity)
      : this.dataSource.getRepository(RoleEntity);
  }

  private toAuthenticatedUser(entity: UserEntity): AuthenticatedUser {
    const roles = entity.roles?.map((role) => role.name) ?? [];
    const permissions = [
      ...new Set(
        entity.roles?.flatMap(
          (role) =>
            role.permissions?.map((permission) => permission.name) ?? [],
        ) ?? [],
      ),
    ];

    return {
      id: entity.id,
      email: entity.email,
      name: entity.name,
      roles,
      permissions,
    };
  }

  async findByEmail(email: string): Promise<UserAuthData | null> {
    const entity = await this.getUserRepo().findOne({
      where: { email },
      relations: { roles: { permissions: true } },
    });

    if (!entity) {
      return null;
    }

    return {
      ...this.toAuthenticatedUser(entity),
      passwordHash: entity.passwordHash,
    };
  }

  async findByIdWithRolesAndPermissions(
    id: string,
  ): Promise<AuthenticatedUser | null> {
    const entity = await this.getUserRepo().findOne({
      where: { id },
      relations: { roles: { permissions: true } },
    });

    return entity ? this.toAuthenticatedUser(entity) : null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.getUserRepo().count({ where: { email } });
    return count > 0;
  }

  async findRoleIdsByNames(
    names: string[],
    trx?: QueryRunner,
  ): Promise<string[]> {
    const roles = await this.getRoleRepo(trx).find({
      where: { name: In(names) },
    });
    return roles.map((role) => role.id);
  }

  async create(params: CreateUserParams, trx?: QueryRunner): Promise<User> {
    const roleRepo = this.getRoleRepo(trx);
    const roles = await roleRepo.find({
      where: { name: In(params.roleNames) },
      relations: { permissions: true },
    });

    if (roles.length !== params.roleNames.length) {
      const missing = params.roleNames.filter(
        (name) => !roles.some((role) => role.name === name),
      );
      throw new Error(`Missing roles: ${missing.join(', ')}`);
    }

    const entity = new UserEntity();
    entity.email = params.email;
    entity.name = params.name;
    entity.passwordHash = params.passwordHash;
    entity.roles = roles;

    const saved = await this.getUserRepo(trx).save(entity);
    return this.mapper.toModel(saved);
  }

  async save(user: User, trx?: QueryRunner): Promise<User> {
    const repo = this.getUserRepo(trx);
    const existing = await repo.findOne({
      where: { id: user.id },
      relations: { roles: true },
    });

    const entity = this.mapper.toPersistence(user);

    if (existing) {
      entity.passwordHash = existing.passwordHash;
      entity.roles = existing.roles;
    }

    const saved = await repo.save(entity);
    return this.mapper.toModel(saved);
  }

  async findMany(
    options?: QueryOptions<UserEntity>,
  ): Promise<PaginatedResult<User>> {
    return super.findMany(options);
  }
}
