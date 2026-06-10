import { PasswordService } from '../../../src/modules/auth/infrastructure/services/password.service';

jest.mock('../../../src/configuration/environments-variables', () => ({
  ENVIRONMENT_VARIABLES: {
    BCRYPT_ROUNDS: 4,
  },
}));

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  it('hashes and compares passwords', async () => {
    const hash = await passwordService.hash('secret-password');

    expect(hash).not.toBe('secret-password');
    expect(await passwordService.compare('secret-password', hash)).toBe(true);
    expect(await passwordService.compare('wrong-password', hash)).toBe(false);
  });

  it('produces bcrypt hashes with configured cost', async () => {
    const hash = await passwordService.hash('secret-password');

    expect(hash.startsWith('$2')).toBe(true);
    expect(hash.split('$')[2]).toBe('04');
  });
});
