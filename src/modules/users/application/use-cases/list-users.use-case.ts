import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PaginatedResult } from '../../../shared/domain/repositories';
import { QueryUseCase } from '../../../shared/application/use-cases/query.use-case';
import { User } from '../../domain/models/user.model';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../ports/user.repository.port';

export type ListUsersQuery = {
  page: number;
  perPage: number;
};

@Injectable()
export class ListUsersUseCase extends QueryUseCase<
  ListUsersQuery,
  PaginatedResult<User>
> {
  constructor(
    logger: PinoLogger,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {
    super(logger);
  }

  protected async executeQuery(
    query: ListUsersQuery,
  ): Promise<PaginatedResult<User>> {
    return this.userRepository.findMany({
      page: query.page,
      perPage: query.perPage,
      order: { createdAt: 'DESC' },
    });
  }
}
