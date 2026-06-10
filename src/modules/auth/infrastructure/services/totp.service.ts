import { Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import { ENVIRONMENT_VARIABLES } from '../../../../configuration/environments-variables';
import { EncryptionService } from './encryption.service';

@Injectable()
export class TotpService {
  constructor(private readonly encryptionService: EncryptionService) {}

  generateSecret(): string {
    return generateSecret();
  }

  buildOtpAuthUri(email: string, secret: string): string {
    return generateURI({
      issuer: ENVIRONMENT_VARIABLES.APP_NAME,
      label: email,
      secret,
    });
  }

  async buildQrCodeDataUrl(otpauthUri: string): Promise<string> {
    return QRCode.toDataURL(otpauthUri);
  }

  verify(code: string, encryptedSecret: string): boolean {
    const secret = this.encryptionService.decrypt(encryptedSecret);
    return verifySync({ token: code, secret }).valid;
  }

  encryptSecret(secret: string): string {
    return this.encryptionService.encrypt(secret);
  }
}
