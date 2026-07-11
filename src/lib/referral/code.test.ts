import { test, expect, describe } from 'vitest'
import { generateReferralCode, isValidReferralCode } from './code'

describe('generateReferralCode', () => {
  test('produces an 8-char url-safe code', () => {
    const code = generateReferralCode()
    expect(code).toMatch(/^[0-9A-Za-z_-]{8}$/)
  })
  test('produces distinct codes across many calls', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateReferralCode()))
    expect(codes.size).toBe(1000)
  })
})

describe('isValidReferralCode', () => {
  test('accepts a well-formed code', () => {
    expect(isValidReferralCode('Ab3_-xY9')).toBe(true)
  })
  test('rejects wrong length or bad chars', () => {
    expect(isValidReferralCode('short')).toBe(false)
    expect(isValidReferralCode('has space')).toBe(false)
    expect(isValidReferralCode('')).toBe(false)
  })
})
