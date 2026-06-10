import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';

@Injectable()
export class PasswordService {
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, ENVIRONMENT_VARIABLES.BCRYPT_ROUNDS);
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
