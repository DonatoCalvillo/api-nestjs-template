import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { ITransactionManager } from '../../application/ports/transaction-manager.port';

@Injectable()
export class TypeOrmTransactionManager implements ITransactionManager {
  constructor(private readonly dataSource: DataSource) {}

  async run<T>(work: (trx: QueryRunner) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await work(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
