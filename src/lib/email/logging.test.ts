import { test, expect, vi, afterEach } from 'vitest'
import { LoggingEmailSender } from './logging'
import { FakeEmailSender } from './fake'
import { createEmailSender } from './factory'

afterEach(() => vi.restoreAllMocks())

test('records the message and prints it to the console', async () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const sender = new LoggingEmailSender()
  await sender.send({ to: 'a@example.com', subject: 'Hi', html: '<a href="http://x/api/verify?token=t1">verify</a>' })
  expect(sender.sent).toHaveLength(1)
  expect(log).toHaveBeenCalledTimes(1)
  expect(log.mock.calls[0].join(' ')).toContain('verify?token=t1')
})

test('factory falls back to the logging sender when no provider is configured', () => {
  const sender = createEmailSender({} as NodeJS.ProcessEnv)
  expect(sender).toBeInstanceOf(LoggingEmailSender)
  expect(sender).toBeInstanceOf(FakeEmailSender) // subclass, existing factory tests keep passing
})
