export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export type SendEmailParams = {
  to: string;
  subject: string;
  body: string;
};

export interface IEmailSender {
  send(params: SendEmailParams): Promise<void>;
}
