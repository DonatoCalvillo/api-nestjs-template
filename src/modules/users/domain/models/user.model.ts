import { EmailValueObject, NonEmptyStringValueObject } from 'value-object-lib';
import { AggregateRoot } from '../../../shared/domain/model';
import { BaseModelParams } from '../../../shared/domain/model/model.interface';
import { UserUpdatedEvent } from '../events/user-updated.event';

export type UserProps = {
  name: NonEmptyStringValueObject;
  email: EmailValueObject;
};

export class User extends AggregateRoot<UserProps> {
  constructor(params: BaseModelParams<UserProps>) {
    super(params);
  }

  get name(): string {
    return this.props.name.value;
  }

  get email(): string {
    return this.props.email.value;
  }

  update(params: { name?: string; email?: string }): User {
    const name = params.name ?? this.name;
    const email = params.email ?? this.email;

    const updated = new User({
      id: this.id,
      props: {
        name: new NonEmptyStringValueObject('name', name),
        email: new EmailValueObject('email', email),
      },
      createdAt: this.createdAt,
      updatedAt: new Date(),
      version: this.version,
    });

    updated.addDomainEvent(new UserUpdatedEvent(updated.id, updated.email));

    return updated;
  }
}
