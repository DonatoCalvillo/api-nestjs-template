import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { QueryRunner } from 'typeorm';
import { RBAC_ROLES } from '../../../auth/domain/constants/rbac.constants';
import {
  EmailAlreadyExistsError,
  ForbiddenAccessError,
} from '../../../auth/domain/errors/auth.errors';
import {
  AuditLog,
  CommandUseCase,
  ITransactionManager,
  TRANSACTION_MANAGER,
} from '../../../shared/application';
import { ConcurrencyConflictError } from '../../../shared/domain/errors/concurrency-conflict.error';
import { NotFoundError } from '../../../shared/domain/errors/not-found.error';
import { User } from '../../domain/models/user.model';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../ports/user.repository.port';
import { AuthenticatedUser } from '../types/authenticated-user';

export type UpdateUserCommand = {
  id: string;
  name?: string;
  email?: string;
  version: number;
  actor: AuthenticatedUser;
};

@Injectable()
@AuditLog({
  action: 'user.update',
  entityType: 'User',
  entityId: (cmd: UpdateUserCommand) => cmd.id,
  getBeforeState: async (cmd, { useCase, trx }) =>
    (useCase as UpdateUserUseCase).findByIdForAudit(cmd.id, trx),
})
export class UpdateUserUseCase extends CommandUseCase<UpdateUserCommand, User> {
  constructor(
    logger: PinoLogger,
    @Inject(TRANSACTION_MANAGER)
    transactionManager: ITransactionManager,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {
    super(logger, transactionManager);
  }

  async findByIdForAudit(
    id: string,
    trx?: QueryRunner,
  ): Promise<Record<string, unknown> | null> {
    const user = await this.userRepository.findById(id, { trx });
    return user ? user.toJSON() : null;
  }

  protected async executeCommand(
    command: UpdateUserCommand,
    trx?: QueryRunner,
  ): Promise<User> {
    const isOwner = command.actor.id === command.id;
    const isAdmin = command.actor.roles.includes(RBAC_ROLES.ADMIN);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenAccessError();
    }

    const user = await this.userRepository.findById(command.id, { trx });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.version !== command.version) {
      throw new ConcurrencyConflictError();
    }

    if (
      command.email &&
      command.email !== user.email &&
      (await this.userRepository.existsByEmail(command.email))
    ) {
      throw new EmailAlreadyExistsError();
    }

    const updated = user.update({
      name: command.name,
      email: command.email,
    });

    return this.userRepository.save(updated, trx);
  }
}
