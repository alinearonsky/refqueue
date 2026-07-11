import { test, expect, describe } from 'vitest'
import { createEmailSender } from './factory'
import { ResendEmailSender } from './resend'
import { SmtpEmailSender } from './smtp'
import { FakeEmailSender } from './fake'

describe('createEmailSender', () => {
  test('uses Resend when RESEND_API_KEY is set', () => {
    const s = createEmailSender({ RESEND_API_KEY: 're_x', EMAIL_FROM: 'from@x' } as unknown as NodeJS.ProcessEnv)
    expect(s).toBeInstanceOf(ResendEmailSender)
  })
  test('uses SMTP when SMTP_HOST is set and no Resend key', () => {
    const s = createEmailSender({ SMTP_HOST: 'smtp.x', EMAIL_FROM: 'from@x' } as unknown as NodeJS.ProcessEnv)
    expect(s).toBeInstanceOf(SmtpEmailSender)
  })
  test('falls back to Fake when no provider is configured', () => {
    const s = createEmailSender({} as unknown as NodeJS.ProcessEnv)
    expect(s).toBeInstanceOf(FakeEmailSender)
  })
  test('throws if a provider is configured without EMAIL_FROM', () => {
    expect(() => createEmailSender({ RESEND_API_KEY: 're_x' } as unknown as NodeJS.ProcessEnv)).toThrow(/EMAIL_FROM/)
  })
})
