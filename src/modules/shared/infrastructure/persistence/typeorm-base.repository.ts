import { Logger } from '@nestjs/common';
import {
  DataSource,
  FindManyOptions,
  FindOneOptions,
  QueryRunner,
  Repository,
} from 'typeorm';
import { IMapper } from '../../application/mappers';
import { DatabaseError } from '../../domain/errors/database';
import { IModel } from '../../domain/model/model.interface';
import {
  FindByIdOptions,
  IRepository,
  PaginatedResult,
  QueryOptions,
} from '../../domain/repositories';
import { IEntity } from './entity.interface';

export abstract class TypeOrmBaseRepository<
  TModel extends IModel<object>,
  TEntity extends IEntity,
> implements IRepository<TModel> {
  private readonly logger: Logger;

  constructor(
    protected readonly mapper: IMapper<TModel, TEntity>,
    protected readonly dataSource: DataSource,
    private readonly logContext: string,
  ) {
    this.logger = new Logger(logContext);
  }

  protected abstract entityClass(): new () => TEntity;

  private safeStringify(value: unknown): string {
    const seen = new WeakSet<object>();
    try {
      return JSON.stringify(value, (_key, val) => {
        if (val && typeof val === 'object') {
          if (seen.has(val)) return '[Circular]';
          seen.add(val);
        }
        return val;
      });
    } catch {
      return '[Unserializable]';
    }
  }

  private safeLogQueryOptions(options?: QueryOptions<TEntity>): string {
    if (!options) return 'null';
    return this.safeStringify({
      ...options,
      trx: options.trx ? '[QueryRunner]' : undefined,
    });
  }

  protected getRepoForTrx(trx?: QueryRunner): Repository<TEntity> {
    return trx
      ? trx.manager.getRepository(this.entityClass())
      : this.dataSource.getRepository(this.entityClass());
  }

  async findById(
    id: string,
    options?: FindByIdOptions,
  ): Promise<TModel | null> {
    this.logger.log(`Running repository: ${this.logContext} find by id: ${id}`);
    try {
      const repo = this.getRepoForTrx(options?.trx);
      const findOpts: FindOneOptions<TEntity> = {
        where: { id } as FindOneOptions<TEntity>['where'],
        relations: options?.relations,
        relationLoadStrategy: options?.relationLoadStrategy,
      };
      const entity = await repo.findOne(findOpts);
      this.logger.log(
        `Repository: ${this.logContext} find by id: ${id} completed`,
      );
      return entity ? this.mapper.toModel(entity) : null;
    } catch (error) {
      this.logger.error(
        `Error running repository: ${this.logContext} find by id: ${id}`,
        error,
      );
      throw new DatabaseError(error);
    }
  }

  async findOne(options?: QueryOptions<TEntity>): Promise<TModel | null> {
    this.logger.log(`Running repository: ${this.logContext} find one`);
    this.logger.debug(`Options: ${this.safeLogQueryOptions(options)}`);

    try {
      const repo = this.getRepoForTrx(options?.trx);
      const findOpts: FindOneOptions<TEntity> = {
        where: options?.where as FindOneOptions<TEntity>['where'],
        relations: options?.relations,
        select: options?.select as FindOneOptions<TEntity>['select'],
        order: options?.order as FindOneOptions<TEntity>['order'],
        relationLoadStrategy: options?.relationLoadStrategy,
      };
      const entity = await repo.findOne(findOpts);
      return entity ? this.mapper.toModel(entity) : null;
    } catch (error) {
      this.logger.error(
        `Error running repository: ${this.logContext} find one`,
        error,
      );
      throw new DatabaseError(error);
    }
  }

  async findMany(
    options?: QueryOptions<TEntity>,
  ): Promise<PaginatedResult<TModel>> {
    this.logger.log(`Running repository: ${this.logContext} find many`);
    this.logger.debug(`Options: ${this.safeLogQueryOptions(options)}`);
    try {
      const repo = this.getRepoForTrx(options?.trx);
      const page = options?.page && options.page > 0 ? options.page : undefined;
      const perPage =
        options?.perPage && options.perPage > 0 ? options.perPage : undefined;

      const findOpts: FindManyOptions<TEntity> = {
        where: options?.where as FindManyOptions<TEntity>['where'],
        relations: options?.relations,
        select: options?.select as FindManyOptions<TEntity>['select'],
        order: options?.order as FindManyOptions<TEntity>['order'],
        skip: page && perPage ? (page - 1) * perPage : undefined,
        take: perPage,
        relationLoadStrategy: options?.relationLoadStrategy,
      };

      const [entities, total] = await repo.findAndCount(findOpts);
      const items = entities.map((entity) => this.mapper.toModel(entity));
      this.logger.log(`Repository: ${this.logContext} find many completed`);
      return { items, total };
    } catch (error) {
      this.logger.error(
        `Error running repository: ${this.logContext} find many`,
        error,
      );
      throw new DatabaseError(error);
    }
  }

  async save(model: TModel, trx?: QueryRunner): Promise<void> {
    this.logger.log(`Running repository: ${this.logContext} save`);
    this.logger.debug(`Model: ${JSON.stringify(model)}`);
    try {
      const repo = this.getRepoForTrx(trx);
      const entity = this.mapper.toPersistence(model);
      await repo.save(entity);
      this.logger.log(`Repository: ${this.logContext} save completed`);
    } catch (error) {
      this.logger.error(
        `Error running repository: ${this.logContext} save`,
        error,
      );
      throw new DatabaseError(error);
    }
  }

  async delete(model: TModel, trx?: QueryRunner): Promise<void> {
    this.logger.log(`Running repository: ${this.logContext} delete`);
    this.logger.debug(`Model: ${JSON.stringify(model)}`);
    try {
      const repo = this.getRepoForTrx(trx);
      const entity = this.mapper.toPersistence(model);
      await repo.remove(entity);
      this.logger.log(`Repository: ${this.logContext} delete completed`);
    } catch (error) {
      this.logger.error(
        `Error running repository: ${this.logContext} delete`,
        error,
      );
      throw new DatabaseError(error);
    }
  }

  async softDelete(model: TModel, trx?: QueryRunner): Promise<void> {
    this.logger.log(`Running repository: ${this.logContext} soft delete`);
    this.logger.debug(`Model: ${JSON.stringify(model)}`);
    try {
      const repo = this.getRepoForTrx(trx);
      const entity = this.mapper.toPersistence(model);

      if (typeof repo.softRemove === 'function') {
        await repo.softRemove(entity);
        this.logger.log(`Repository: ${this.logContext} soft delete completed`);
        return;
      }

      const id = entity.id;
      if (id && typeof repo.softDelete === 'function') {
        await repo.softDelete(id);
        this.logger.log(`Repository: ${this.logContext} soft delete completed`);
        return;
      }

      await repo.remove(entity);
      this.logger.log(
        `Repository: ${this.logContext} soft delete fell back to remove`,
      );
    } catch (error) {
      this.logger.error(
        `Error running repository: ${this.logContext} soft delete`,
        error,
      );
      throw new DatabaseError(error);
    }
  }
}
