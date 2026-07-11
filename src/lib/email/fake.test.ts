import { test, expect, describe } from 'vitest'
import { FakeEmailSender } from './fake'

describe('FakeEmailSender', () => {
  test('records sent messages for assertion', async () => {
    const sender = new FakeEmailSender()
    await sender.send({ to: 'a@b.com', subject: 'Confirm', html: '<a>x</a>' })
    expect(sender.sent).toHaveLength(1)
    expect(sender.sent[0].to).toBe('a@b.com')
    expect(sender.sent[0].subject).toBe('Confirm')
  })
})
