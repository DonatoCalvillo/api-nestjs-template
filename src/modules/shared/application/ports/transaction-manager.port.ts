import { QueryRunner } from 'typeorm';

export const TRANSACTION_MANAGER = Symbol('TRANSACTION_MANAGER');

export interface ITransactionManager {
  run<T>(work: (trx: QueryRunner) => Promise<T>): Promise<T>;
}
