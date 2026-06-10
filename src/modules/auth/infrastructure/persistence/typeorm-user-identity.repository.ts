import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IUserIdentityRepository } from '../../application/ports/user-identity.repository.port';
import { UserIdentityEntity } from './user-identity.entity';

@Injectable()
export class TypeOrmUserIdentityRepository implements IUserIdentityRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findUserIdByProviderSub(
    provider: string,
    providerSub: string,
  ): Promise<string | null> {
    const entity = await this.dataSource
      .getRepository(UserIdentityEntity)
      .findOne({
        where: { provider, providerSub },
      });

    return entity?.userId ?? null;
  }

  async link(params: {
    userId: string;
    provider: string;
    providerSub: string;
    email: string;
  }): Promise<void> {
    const entity = new UserIdentityEntity();
    entity.userId = params.userId;
    entity.provider = params.provider;
    entity.providerSub = params.providerSub;
    entity.email = params.email;
    await this.dataSource.getRepository(UserIdentityEntity).save(entity);
  }
}
