# Email

Transactional emails (verification, password reset, welcome) are sent through the `IEmailSender` port. The default adapter logs messages instead of sending mail.

## What it is

Application code depends on `EMAIL_SENDER` token, not a specific SMTP library. Swap the adapter in `SharedModule` or a dedicated `NotificationsModule` for production.

## Default adapter

`LoggingEmailSender` writes email content to structured logs. Used in development and for flows like:

- Email verification on registration
- Password reset links
- Welcome email on `UserCreatedEvent`

Implementation: `src/modules/shared/infrastructure/email/logging-email-sender.ts`.

Port: `src/modules/shared/application/ports/email-sender.port.ts`.

## Production adapter

Implement `IEmailSender` with your provider (SendGrid, AWS SES, Nodemailer, etc.):

```typescript
@Injectable()
export class SmtpEmailSender implements IEmailSender {
  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
  }
}
```

Register in module providers:

```typescript
{ provide: EMAIL_SENDER, useClass: SmtpEmailSender }
```

## Related auth flows

| Flow | Trigger |
|------|---------|
| Verification email | `UserCreatedEvent` → `SendVerificationEmailHandler` |
| Password reset | `ForgotPasswordUseCase` |
| Welcome email | Optional `@OnEvent` handler |

See [auth.md](../auth.md) for endpoints and env vars (`EMAIL_VERIFICATION_TTL_HOURS`, `PASSWORD_RESET_TTL_HOURS`).

## Related guides

- [Domain events](../../guides/domain-events.md) — React to `UserCreatedEvent`
