import { Resend } from 'resend'
import type { EmailSender, EmailMessage } from './types'

/** The minimal slice of the Resend client we depend on (keeps the sender testable). */
export interface ResendLike {
  emails: {
    send(args: { from: string; to: string; subject: string; html: string }): Promise<{ data: unknown; error: unknown | null }>
  }
}

export class ResendEmailSender implements EmailSender {
  constructor(private readonly from: string, private readonly client: ResendLike) {}

  async send(msg: EmailMessage): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    })
    if (error) throw new Error(`Resend send failed: ${JSON.stringify(error)}`)
  }
}

export function makeResendSender(apiKey: string, from: string): ResendEmailSender {
  return new ResendEmailSender(from, new Resend(apiKey) as unknown as ResendLike)
}
