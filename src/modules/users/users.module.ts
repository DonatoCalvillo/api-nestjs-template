import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_REPOSITORY } from './application/ports/user.repository.port';
import { UserMapper } from './infrastructure/mappers/user.mapper';
import { PermissionEntity } from './infrastructure/persistence/permission.entity';
import { RoleEntity } from './infrastructure/persistence/role.entity';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm-user.repository';
import { UserEntity } from './infrastructure/persistence/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, RoleEntity, PermissionEntity]),
  ],
  providers: [
    UserMapper,
    TypeOrmUserRepository,
    {
      provide: USER_REPOSITORY,
      useExisting: TypeOrmUserRepository,
    },
  ],
  exports: [USER_REPOSITORY, UserMapper],
})
export class UsersModule {}
