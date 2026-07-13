import { afterEach, describe, expect, it } from 'vitest'
import { getMakerCredentials, getSupabaseAnonKey, sessionCookieOptions } from './config'

const savedEnv = { ...process.env }
afterEach(() => {
  process.env = { ...savedEnv }
})

describe('getSupabaseAnonKey', () => {
  it('returns the key when set', () => {
    process.env.SUPABASE_ANON_KEY = 'anon-123'
    expect(getSupabaseAnonKey()).toBe('anon-123')
  })

  it('throws when unset', () => {
    delete process.env.SUPABASE_ANON_KEY
    expect(() => getSupabaseAnonKey()).toThrow('SUPABASE_ANON_KEY')
  })
})

describe('getMakerCredentials', () => {
  it('returns credentials when both vars are set', () => {
    process.env.MAKER_EMAIL = 'maker@example.com'
    process.env.MAKER_PASSWORD = 'hunter22'
    expect(getMakerCredentials()).toEqual({ email: 'maker@example.com', password: 'hunter22' })
  })

  it('returns null when either var is missing', () => {
    process.env.MAKER_EMAIL = 'maker@example.com'
    delete process.env.MAKER_PASSWORD
    expect(getMakerCredentials()).toBeNull()

    delete process.env.MAKER_EMAIL
    process.env.MAKER_PASSWORD = 'hunter22'
    expect(getMakerCredentials()).toBeNull()
  })
})

describe('sessionCookieOptions', () => {
  it('is always httpOnly, secure only on https deployments', () => {
    process.env.APP_BASE_URL = 'https://waitlist.example.com'
    expect(sessionCookieOptions()).toEqual({ httpOnly: true, secure: true })

    process.env.APP_BASE_URL = 'http://localhost:3000'
    expect(sessionCookieOptions()).toEqual({ httpOnly: true, secure: false })
  })
})
