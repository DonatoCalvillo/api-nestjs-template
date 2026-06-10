import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';

@Injectable()
export class AuthTokenService {
  generateToken(): string {
    return randomBytes(32).toString('base64url');
  }

  getEmailVerificationExpiresAt(): Date {
    return addHours(ENVIRONMENT_VARIABLES.EMAIL_VERIFICATION_TTL_HOURS);
  }

  getPasswordResetExpiresAt(): Date {
    return addHours(ENVIRONMENT_VARIABLES.PASSWORD_RESET_TTL_HOURS);
  }
}

function addHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
