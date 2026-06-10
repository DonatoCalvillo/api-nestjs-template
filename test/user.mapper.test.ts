import { EmailValueObject, NonEmptyStringValueObject } from 'value-object-lib';
import { UserMapper } from '../src/modules/users/infrastructure/mappers/user.mapper';
import { User } from '../src/modules/users/domain/models/user.model';
import { UserEntity } from '../src/modules/users/infrastructure/persistence/user.entity';

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

describe('UserMapper', () => {
  const mapper = new UserMapper();

  it('maps entity to model', () => {
    const entity = new UserEntity();
    entity.id = USER_ID;
    entity.name = 'Alice';
    entity.email = 'alice@example.com';
    entity.createdAt = new Date('2026-01-01');
    entity.updatedAt = new Date('2026-01-02');
    entity.version = 1;

    const model = mapper.toModel(entity);

    expect(model.id).toBe(USER_ID);
    expect(model.name).toBe('Alice');
    expect(model.email).toBe('alice@example.com');
    expect(model.version).toBe(1);
  });

  it('maps model to persistence entity', () => {
    const model = new User({
      id: USER_ID,
      props: {
        name: new NonEmptyStringValueObject('name', 'Alice'),
        email: new EmailValueObject('email', 'alice@example.com'),
      },
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      version: 2,
    });

    const entity = mapper.toPersistence(model);

    expect(entity.id).toBe(USER_ID);
    expect(entity.name).toBe('Alice');
    expect(entity.email).toBe('alice@example.com');
    expect(entity.version).toBe(2);
  });
});
