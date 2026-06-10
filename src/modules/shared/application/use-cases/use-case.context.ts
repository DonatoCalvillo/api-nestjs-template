import { QueryRunner } from 'typeorm';

export type UseCaseContext = {
  trx?: QueryRunner;
};
