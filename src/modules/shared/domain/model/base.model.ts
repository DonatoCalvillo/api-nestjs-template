import { DateValueObject, UUIDValueObject } from 'value-object-lib';
import { BaseModelParams, IModel, ModelMetadata } from './model.interface';
import { toPrimitives } from './model.utils';

export abstract class BaseModel<
  TProps extends object,
> implements IModel<TProps> {
  protected readonly props: TProps;
  private readonly _id: UUIDValueObject;
  private readonly _createdAt: DateValueObject | null;
  private readonly _updatedAt: DateValueObject | null;

  constructor({
    id,
    props,
    createdAt = null,
    updatedAt = null,
  }: BaseModelParams<TProps>) {
    this._id = new UUIDValueObject('id', id);
    this._createdAt = createdAt
      ? new DateValueObject('createdAt', createdAt)
      : null;
    this._updatedAt = updatedAt
      ? new DateValueObject('updatedAt', updatedAt)
      : null;
    this.props = Object.freeze(props);
  }

  get id(): string {
    return this._id.value;
  }

  get createdAt(): Date | null {
    return this._createdAt?.value ?? null;
  }

  get updatedAt(): Date | null {
    return this._updatedAt?.value ?? null;
  }

  equals(other?: IModel): boolean {
    if (!other) {
      return false;
    }

    return this.id === other.id;
  }

  toJSON(): TProps & ModelMetadata {
    const primitives = toPrimitives(this.props) as TProps;

    return {
      ...primitives,
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
