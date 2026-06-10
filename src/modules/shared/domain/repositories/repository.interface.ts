import { QueryRunner } from 'typeorm';
import { IModel } from '../model/model.interface';

export type SortDirection = 'ASC' | 'DESC';
export type Order<T> = Partial<Record<keyof T, SortDirection>>;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
};

export type FindByIdOptions = {
  relations?: string[];
  trx?: QueryRunner;
  relationLoadStrategy?: 'join' | 'query';
};

export type QueryOptions<T = object> = {
  where?:
    | Partial<Record<keyof T, unknown>>
    | Partial<Record<keyof T, unknown>>[];
  relations?: string[];
  select?: (keyof T)[];
  order?: Order<T>;
  page?: number;
  perPage?: number;
  trx?: QueryRunner;
  relationLoadStrategy?: 'join' | 'query';
};

export interface IRepository<TModel extends IModel<object>> {
  findById(id: string, options?: FindByIdOptions): Promise<TModel | null>;
  findOne(options?: QueryOptions): Promise<TModel | null>;
  findMany(options?: QueryOptions): Promise<PaginatedResult<TModel>>;
  save(model: TModel, trx?: QueryRunner): Promise<void>;
  delete(model: TModel, trx?: QueryRunner): Promise<void>;
  softDelete(model: TModel, trx?: QueryRunner): Promise<void>;
}
