import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_REPOSITORY } from './application/ports/user.repository.port';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { UsersController } from './infrastructure/controllers/users.controller';
import { LogUserUpdatedHandler } from './infrastructure/events/log-user-updated.handler';
import { UserMapper } from './infrastructure/mappers/user.mapper';
import { PermissionEntity } from './infrastructure/persistence/permission.entity';
import { RoleEntity } from './infrastructure/persistence/role.entity';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm-user.repository';
import { UserEntity } from './infrastructure/persistence/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RoleEntity, PermissionEntity]),
  ],
  controllers: [UsersController],
  providers: [
    UserMapper,
    TypeOrmUserRepository,
    {
      provide: USER_REPOSITORY,
      useExisting: TypeOrmUserRepository,
    },
    GetCurrentUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    LogUserUpdatedHandler,
  ],
  exports: [USER_REPOSITORY, UserMapper],
})
export class UsersModule {}
