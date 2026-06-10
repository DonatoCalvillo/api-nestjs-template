import { EmailValueObject, NonEmptyStringValueObject } from 'value-object-lib';
import { BaseModel } from '../../../shared/domain/model';

export type UserProps = {
  name: NonEmptyStringValueObject;
  email: EmailValueObject;
};

export class User extends BaseModel<UserProps> {
  get name(): string {
    return this.props.name.value;
  }

  get email(): string {
    return this.props.email.value;
  }
}
