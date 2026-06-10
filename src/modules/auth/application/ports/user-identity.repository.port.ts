export const USER_IDENTITY_REPOSITORY = Symbol('USER_IDENTITY_REPOSITORY');

export interface IUserIdentityRepository {
  findUserIdByProviderSub(
    provider: string,
    providerSub: string,
  ): Promise<string | null>;
  link(params: {
    userId: string;
    provider: string;
    providerSub: string;
    email: string;
  }): Promise<void>;
}
