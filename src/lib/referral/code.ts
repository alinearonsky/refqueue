import { customAlphabet } from 'nanoid'

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-'
const nano = customAlphabet(ALPHABET, 8)

export function generateReferralCode(): string {
  return nano()
}

export function isValidReferralCode(code: string): boolean {
  return /^[0-9A-Za-z_-]{8}$/.test(code)
}
