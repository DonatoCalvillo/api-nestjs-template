import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  IEmailSender,
  SendEmailParams,
} from '../../application/ports/email-sender.port';

@Injectable()
export class LoggingEmailSender implements IEmailSender {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(LoggingEmailSender.name);
  }

  async send(params: SendEmailParams): Promise<void> {
    this.logger.info(
      {
        event: 'email_sent',
        to: params.to,
        subject: params.subject,
      },
      params.body,
    );
  }
}
