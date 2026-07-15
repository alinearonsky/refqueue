import { test, expect, describe, vi } from 'vitest'
import { ResendEmailSender } from './resend'

describe('ResendEmailSender', () => {
  test('maps EmailMessage to the Resend client call with the configured from', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null })
    const sender = new ResendEmailSender('Refqueue <no-reply@refqueue.dev>', { emails: { send } })
    await sender.send({ to: 'a@b.com', subject: 'Hi', html: '<p>x</p>' })
    expect(send).toHaveBeenCalledWith({
      from: 'Refqueue <no-reply@refqueue.dev>',
      to: 'a@b.com',
      subject: 'Hi',
      html: '<p>x</p>',
    })
  })
  test('throws when the Resend client returns an error', async () => {
    const send = vi.fn().mockResolvedValue({ data: null, error: { message: 'bad key' } })
    const sender = new ResendEmailSender('from@x', { emails: { send } })
    await expect(sender.send({ to: 'a@b.com', subject: 's', html: 'h' })).rejects.toThrow(/bad key/)
  })
})
