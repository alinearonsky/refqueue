import type { EmailSender, EmailMessage } from './types'

export class FakeEmailSender implements EmailSender {
  public readonly sent: EmailMessage[] = []
  async send(msg: EmailMessage): Promise<void> {
    this.sent.push(msg)
  }
}
