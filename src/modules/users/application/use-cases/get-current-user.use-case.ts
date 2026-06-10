import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Cache } from 'cache-manager';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { QueryUseCase } from '../../../shared/application/use-cases/query.use-case';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../ports/user.repository.port';
import { AuthenticatedUser } from '../types/authenticated-user';
import { userCacheKey } from '../../infrastructure/events/invalidate-user-cache.handler';

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
    @Optional()
    @Inject(CACHE_MANAGER)
    private readonly cacheManager?: Cache,
  ) {
    super(logger);
  }

  protected async executeQuery(
    query: GetCurrentUserQuery,
  ): Promise<CurrentUserProfile> {
    const cacheKey = userCacheKey(query.userId);

    if (ENVIRONMENT_VARIABLES.CACHE_ENABLED && this.cacheManager) {
      const cached = await this.cacheManager.get<CurrentUserProfile>(cacheKey);

      if (cached) {
        return cached;
      }
    }

    const profile = await this.loadProfile(query.userId);

    if (ENVIRONMENT_VARIABLES.CACHE_ENABLED && this.cacheManager) {
      await this.cacheManager.set(cacheKey, profile);
    }

    return profile;
  }

  private async loadProfile(userId: string): Promise<CurrentUserProfile> {
    const authUser =
      await this.userRepository.findByIdWithRolesAndPermissions(userId);

    if (!authUser) {
      throw new NotFoundError('User not found');
    }

    const user = await this.userRepository.findById(userId);

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
