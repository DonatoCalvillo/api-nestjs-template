import { EmailValueObject, NonEmptyStringValueObject } from 'value-object-lib';
import { IMapper } from '../../../shared/application/mappers';
import { User } from '../../domain/models/user.model';
import { UserEntity } from '../persistence/user.entity';

export class UserMapper implements IMapper<User, UserEntity> {
  toModel(entity: UserEntity): User {
    return new User({
      id: entity.id,
      props: {
        name: new NonEmptyStringValueObject('name', entity.name),
        email: new EmailValueObject('email', entity.email),
      },
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      version: entity.version,
    });
  }

  toPersistence(model: User): UserEntity {
    const entity = new UserEntity();
    entity.id = model.id;
    entity.name = model.name;
    entity.email = model.email;
    entity.createdAt = model.createdAt ?? entity.createdAt;
    entity.updatedAt = model.updatedAt ?? entity.updatedAt;
    entity.version = model.version ?? entity.version;
    return entity;
  }
}
