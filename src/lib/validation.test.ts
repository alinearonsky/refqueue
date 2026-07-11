import { test, expect, describe } from 'vitest'
import { signupInputSchema } from './validation'

describe('signupInputSchema', () => {
  test('accepts a valid signup', () => {
    const r = signupInputSchema.safeParse({ waitlistSlug: 'my-app', email: 'a@b.com' })
    expect(r.success).toBe(true)
  })
  test('accepts an optional referral code', () => {
    const r = signupInputSchema.safeParse({ waitlistSlug: 'my-app', email: 'a@b.com', ref: 'Ab3_-xY9' })
    expect(r.success).toBe(true)
  })
  test('rejects a malformed email', () => {
    const r = signupInputSchema.safeParse({ waitlistSlug: 'my-app', email: 'not-an-email' })
    expect(r.success).toBe(false)
  })
  test('rejects a bad referral code', () => {
    const r = signupInputSchema.safeParse({ waitlistSlug: 'my-app', email: 'a@b.com', ref: 'bad code' })
    expect(r.success).toBe(false)
  })
})
