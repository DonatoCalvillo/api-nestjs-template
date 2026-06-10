import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { QueryRunner } from 'typeorm';
import { RBAC_PERMISSIONS } from '../../../auth/domain/constants/rbac.constants';
import { ForbiddenAccessError } from '../../../auth/domain/errors/auth.errors';
import {
  CommandUseCase,
  ITransactionManager,
  TRANSACTION_MANAGER,
} from '../../../shared/application';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../ports/user.repository.port';
import { AuthenticatedUser } from '../types/authenticated-user';

export type DeleteUserCommand = {
  id: string;
  actor: AuthenticatedUser;
};

@Injectable()
export class DeleteUserUseCase extends CommandUseCase<
  DeleteUserCommand,
  { success: boolean }
> {
  constructor(
    logger: PinoLogger,
    @Inject(TRANSACTION_MANAGER)
    transactionManager: ITransactionManager,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {
    super(logger, transactionManager);
  }

  protected async executeCommand(
    command: DeleteUserCommand,
    trx?: QueryRunner,
  ): Promise<{ success: boolean }> {
    if (command.actor.id === command.id) {
      throw new ForbiddenAccessError('Cannot delete your own account');
    }

    if (!command.actor.permissions.includes(RBAC_PERMISSIONS.USERS_DELETE)) {
      throw new ForbiddenAccessError();
    }

    const user = await this.userRepository.findById(command.id, { trx });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.userRepository.deleteById(command.id, trx);

    return { success: true };
  }
}
