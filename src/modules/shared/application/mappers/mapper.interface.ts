import { IModel } from '../../domain/model/model.interface';
import { IEntity } from '../../infrastructure/persistence/entity.interface';

export interface IMapper<
  TModel extends IModel<object>,
  TEntity extends IEntity,
> {
  toModel(entity: TEntity): TModel;
  toPersistence(model: TModel): TEntity;
}
