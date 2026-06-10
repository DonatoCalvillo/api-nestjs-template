import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { QueryUseCase } from '../../../shared/application/use-cases/query.use-case';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../ports/user.repository.port';
import { AuthenticatedUser } from '../types/authenticated-user';

export type CurrentUserProfile = AuthenticatedUser & {
  createdAt: Date | null;
  updatedAt: Date | null;
  version: number | null;
};

export type GetCurrentUserQuery = {
  userId: string;
};

@Injectable()
export class GetCurrentUserUseCase extends QueryUseCase<
  GetCurrentUserQuery,
  CurrentUserProfile
> {
  constructor(
    logger: PinoLogger,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {
    super(logger);
  }

  protected async executeQuery(
    query: GetCurrentUserQuery,
  ): Promise<CurrentUserProfile> {
    const authUser = await this.userRepository.findByIdWithRolesAndPermissions(
      query.userId,
    );

    if (!authUser) {
      throw new NotFoundError('User not found');
    }

    const user = await this.userRepository.findById(query.userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      ...authUser,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      version: user.version,
    };
  }
}
