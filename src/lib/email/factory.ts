import type { EmailSender } from './types'
import { LoggingEmailSender } from './logging'
import { makeResendSender } from './resend'
import { makeSmtpSender } from './smtp'

/**
 * Selects the email provider from environment:
 *   RESEND_API_KEY  -> Resend (default provider)
 *   SMTP_HOST       -> SMTP fallback (bring-your-own server)
 *   neither         -> LoggingEmailSender (local dev; records + logs, never sends)
 * EMAIL_FROM is required for any real provider.
 */
export function createEmailSender(env: NodeJS.ProcessEnv = process.env): EmailSender {
  const from = env.EMAIL_FROM

  if (env.RESEND_API_KEY) {
    if (!from) throw new Error('EMAIL_FROM must be set when RESEND_API_KEY is configured')
    return makeResendSender(env.RESEND_API_KEY, from)
  }

  if (env.SMTP_HOST) {
    if (!from) throw new Error('EMAIL_FROM must be set when SMTP_HOST is configured')
    return makeSmtpSender({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT ?? '587'),
      secure: env.SMTP_SECURE === 'true',
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from,
    })
  }

  return new LoggingEmailSender()
}
