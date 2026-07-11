import { test, expect, describe, vi } from 'vitest'
import { SmtpEmailSender } from './smtp'

describe('SmtpEmailSender', () => {
  test('maps EmailMessage to transporter.sendMail with the configured from', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: '1' })
    const sender = new SmtpEmailSender('RefQueue <no-reply@refqueue.dev>', { sendMail } as never)
    await sender.send({ to: 'a@b.com', subject: 'Hi', html: '<p>x</p>' })
    expect(sendMail).toHaveBeenCalledWith({
      from: 'RefQueue <no-reply@refqueue.dev>',
      to: 'a@b.com',
      subject: 'Hi',
      html: '<p>x</p>',
    })
  })
  test('propagates a transporter error', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('smtp down'))
    const sender = new SmtpEmailSender('from@x', { sendMail } as never)
    await expect(sender.send({ to: 'a@b.com', subject: 's', html: 'h' })).rejects.toThrow(/smtp down/)
  })
})
