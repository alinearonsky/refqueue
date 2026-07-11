import nodemailer, { type Transporter } from 'nodemailer'
import type { EmailSender, EmailMessage } from './types'

export class SmtpEmailSender implements EmailSender {
  constructor(private readonly from: string, private readonly transporter: Transporter) {}

  async send(msg: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
    })
  }
}

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user?: string
  pass?: string
  from: string
}

export function makeSmtpSender(config: SmtpConfig): SmtpEmailSender {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  })
  return new SmtpEmailSender(config.from, transporter)
}
