import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../../src/modules/users/application/ports/user.repository.port';
import { UserMapper } from '../../../src/modules/users/infrastructure/mappers/user.mapper';
import { PermissionEntity } from '../../../src/modules/users/infrastructure/persistence/permission.entity';
import { RoleEntity } from '../../../src/modules/users/infrastructure/persistence/role.entity';
import { TypeOrmUserRepository } from '../../../src/modules/users/infrastructure/persistence/typeorm-user.repository';
import { UserEntity } from '../../../src/modules/users/infrastructure/persistence/user.entity';
import { truncateTables } from '../../helpers/db-cleanup';
import { seedUserRole } from '../../helpers/seed-roles';
import {
  createTestDataSource,
  getTestDataSourceOptions,
} from '../../helpers/test-data-source';

describe('TypeOrmUserRepository (integration)', () => {
  let moduleRef: TestingModule;
  let repository: IUserRepository;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = await createTestDataSource();

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(getTestDataSourceOptions()),
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
    }).compile();

    repository = moduleRef.get<IUserRepository>(USER_REPOSITORY);
  });

  beforeEach(async () => {
    await truncateTables(dataSource);
    await seedUserRole(dataSource);
  });

  afterAll(async () => {
    await moduleRef?.close();
    await dataSource?.destroy();
  });

  it('creates and finds a user by email', async () => {
    const created = await repository.create({
      email: 'user@example.com',
      name: 'Jane Doe',
      passwordHash: 'hashed-password',
      roleNames: ['user'],
    });

    const found = await repository.findByEmail('user@example.com');

    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
    expect(found?.email).toBe('user@example.com');
    expect(found?.passwordHash).toBe('hashed-password');
  });

  it('reports whether an email already exists', async () => {
    await repository.create({
      email: 'exists@example.com',
      name: 'Existing User',
      passwordHash: 'hashed-password',
      roleNames: ['user'],
    });

    expect(await repository.existsByEmail('exists@example.com')).toBe(true);
    expect(await repository.existsByEmail('missing@example.com')).toBe(false);
  });
});
