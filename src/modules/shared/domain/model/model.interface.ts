export type ModelMetadata = {
  id: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  version: number | null;
};

export type BaseModelParams<TProps extends object> = {
  id: string;
  props: TProps;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  version?: number | null;
};

export interface IModel<TProps extends object = object> {
  readonly id: string;
  readonly createdAt: Date | null;
  readonly updatedAt: Date | null;
  readonly version: number | null;
  equals(other?: IModel): boolean;
  toJSON(): TProps & ModelMetadata;
}
