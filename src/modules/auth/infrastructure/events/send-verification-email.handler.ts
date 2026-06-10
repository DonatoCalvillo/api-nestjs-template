import { OnEvent } from '@nestjs/event-emitter';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { DomainEventEnvelope } from '../../../shared/application/events';
import {
  EMAIL_SENDER,
  IEmailSender,
} from '../../../shared/application/ports/email-sender.port';
import { UserCreatedEvent } from '../../../users/domain/events/user-created.event';
import { AUTH_TOKEN_TYPES } from '../../domain/constants/auth-token.constants';
import {
  AUTH_TOKEN_REPOSITORY,
  IAuthTokenRepository,
} from '../../application/ports/auth-token.repository.port';
import { AuthTokenService } from '../../infrastructure/services/auth-token.service';
import { TypeOrmAuthTokenRepository } from '../../infrastructure/persistence/typeorm-auth-token.repository';
import { Inject } from '@nestjs/common';

@Injectable()
export class SendVerificationEmailOnUserCreatedHandler {
  constructor(
    private readonly logger: PinoLogger,
    @Inject(EMAIL_SENDER)
    private readonly emailSender: IEmailSender,
    @Inject(AUTH_TOKEN_REPOSITORY)
    private readonly authTokenRepository: IAuthTokenRepository,
    private readonly authTokenService: AuthTokenService,
  ) {
    this.logger.setContext(SendVerificationEmailOnUserCreatedHandler.name);
  }

  @OnEvent(UserCreatedEvent.eventName)
  async handle(envelope: DomainEventEnvelope<UserCreatedEvent>): Promise<void> {
    const token = this.authTokenService.generateToken();
    const tokenHash = TypeOrmAuthTokenRepository.hashToken(token);

    await this.authTokenRepository.save({
      userId: envelope.event.userId,
      type: AUTH_TOKEN_TYPES.EMAIL_VERIFY,
      tokenHash,
      expiresAt: this.authTokenService.getEmailVerificationExpiresAt(),
    });

    await this.emailSender.send({
      to: envelope.event.email,
      subject: 'Verify your email',
      body: `Use this token to verify your email: ${token}`,
    });
  }
}
