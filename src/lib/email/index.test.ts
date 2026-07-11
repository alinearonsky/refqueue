import { test, expect, describe, afterEach } from 'vitest'
import { getEmailSender, setEmailSenderForTest } from './index'
import { FakeEmailSender } from './fake'

afterEach(() => setEmailSenderForTest(null))

describe('getEmailSender', () => {
  test('returns the sender injected for tests', () => {
    const fake = new FakeEmailSender()
    setEmailSenderForTest(fake)
    expect(getEmailSender()).toBe(fake)
  })
  test('with no override and no provider env, returns a Fake sender', () => {
    setEmailSenderForTest(null)
    expect(getEmailSender()).toBeInstanceOf(FakeEmailSender)
  })
})
