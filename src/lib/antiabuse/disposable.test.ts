import { test, expect, describe } from 'vitest'
import { isDisposableEmail } from './disposable'

describe('isDisposableEmail', () => {
  test('flags a known disposable domain', () => {
    expect(isDisposableEmail('someone@mailinator.com')).toBe(true)
  })
  test('allows a normal domain', () => {
    expect(isDisposableEmail('aline@gmail.com')).toBe(false)
  })
  test('is case-insensitive on the domain', () => {
    expect(isDisposableEmail('X@Mailinator.COM')).toBe(true)
  })
  test('treats a malformed email (no domain) as not disposable', () => {
    expect(isDisposableEmail('nope')).toBe(false)
  })
})
