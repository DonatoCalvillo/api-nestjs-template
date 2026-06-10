import { IUserRepository } from '../../src/modules/users/application/ports/user.repository.port';

export const createMockUserRepository = (): jest.Mocked<IUserRepository> => ({
  findByEmail: jest.fn(),
  findByIdWithRolesAndPermissions: jest.fn(),
  existsByEmail: jest.fn(),
  findAuthDataById: jest.fn(),
  markEmailVerified: jest.fn(),
  updatePasswordHash: jest.fn(),
  setMfaPendingSecret: jest.fn(),
  enableMfa: jest.fn(),
  create: jest.fn(),
  findRoleIdsByNames: jest.fn(),
  findById: jest.fn(),
  save: jest.fn(),
  deleteById: jest.fn(),
  findMany: jest.fn(),
});
