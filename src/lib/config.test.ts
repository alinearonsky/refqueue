import { afterEach, describe, expect, it } from 'vitest'
import {
  collectProductionConfigErrors,
  getMakerCredentials,
  getPoweredByConfig,
  getRewardTiersConfig,
  getSupabaseAnonKey,
  getThemeConfig,
  sessionCookieOptions,
} from './config'

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

describe('getRewardTiersConfig', () => {
  it('parses, validates, and sorts tiers ascending by referrals', () => {
    process.env.REWARD_TIERS = '[{"referrals":10,"label":"Founding member"},{"referrals":3,"label":"Early access"}]'
    expect(getRewardTiersConfig()).toEqual([
      { referrals: 3, label: 'Early access' },
      { referrals: 10, label: 'Founding member' },
    ])
  })

  it('returns [] when unset', () => {
    delete process.env.REWARD_TIERS
    expect(getRewardTiersConfig()).toEqual([])
  })

  it('returns [] on malformed JSON or invalid shapes (fail-safe, never throws)', () => {
    process.env.REWARD_TIERS = 'not json'
    expect(getRewardTiersConfig()).toEqual([])

    process.env.REWARD_TIERS = '[{"referrals":0,"label":"zero is not positive"}]'
    expect(getRewardTiersConfig()).toEqual([])

    process.env.REWARD_TIERS = '[{"referrals":3,"label":""}]'
    expect(getRewardTiersConfig()).toEqual([])
  })
})

describe('getPoweredByConfig', () => {
  it('is on by default and off only for the literal string "false"', () => {
    delete process.env.POWERED_BY
    expect(getPoweredByConfig()).toBe(true)

    process.env.POWERED_BY = 'true'
    expect(getPoweredByConfig()).toBe(true)

    process.env.POWERED_BY = 'false'
    expect(getPoweredByConfig()).toBe(false)
  })
})

describe('getThemeConfig', () => {
  it('returns an empty object when nothing is set', () => {
    delete process.env.THEME_ACCENT_COLOR
    delete process.env.THEME_LOGO_URL
    delete process.env.THEME_HEADLINE
    delete process.env.THEME_SUBHEAD
    delete process.env.THEME_CTA_LABEL
    expect(getThemeConfig()).toEqual({})
  })

  it('accepts valid values', () => {
    process.env.THEME_ACCENT_COLOR = '#7c3aed'
    process.env.THEME_LOGO_URL = 'https://example.com/logo.png'
    process.env.THEME_HEADLINE = 'Get early access'
    process.env.THEME_SUBHEAD = 'Skip the line by inviting friends.'
    process.env.THEME_CTA_LABEL = 'Count me in'
    expect(getThemeConfig()).toEqual({
      accentColor: '#7c3aed',
      logoUrl: 'https://example.com/logo.png',
      headline: 'Get early access',
      subhead: 'Skip the line by inviting friends.',
      ctaLabel: 'Count me in',
    })
  })

  it('accepts 3-digit hex and rejects non-hex accents (injection guard) and non-http(s) logo URLs', () => {
    process.env.THEME_ACCENT_COLOR = '#f0a'
    expect(getThemeConfig().accentColor).toBe('#f0a')

    process.env.THEME_ACCENT_COLOR = 'red;} body { display:none'
    expect(getThemeConfig().accentColor).toBeUndefined()

    process.env.THEME_LOGO_URL = 'javascript:alert(1)'
    expect(getThemeConfig().logoUrl).toBeUndefined()

    process.env.THEME_LOGO_URL = 'HTTPS://example.com/logo.png'
    expect(getThemeConfig().logoUrl).toBe('HTTPS://example.com/logo.png')
  })
})

describe('collectProductionConfigErrors', () => {
  function validProdEnv(): NodeJS.ProcessEnv {
    return {
      SUPABASE_URL: 'https://xyz.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      SUPABASE_ANON_KEY: 'anon-key',
      APP_BASE_URL: 'https://waitlist.example.com',
      EMAIL_FROM: 'Refqueue <no-reply@example.com>',
      RESEND_API_KEY: 're_123',
    } as unknown as NodeJS.ProcessEnv
  }

  it('returns no errors for a fully configured production env', () => {
    expect(collectProductionConfigErrors(validProdEnv())).toEqual([])
  })

  it('accepts SMTP as the provider instead of Resend', () => {
    const env = validProdEnv()
    delete env.RESEND_API_KEY
    env.SMTP_HOST = 'smtp.example.com'
    expect(collectProductionConfigErrors(env)).toEqual([])
  })

  it('flags a missing email provider (double-opt-in cannot function)', () => {
    const env = validProdEnv()
    delete env.RESEND_API_KEY
    const errors = collectProductionConfigErrors(env)
    expect(errors.some((e) => e.includes('RESEND_API_KEY') && e.includes('SMTP_HOST'))).toBe(true)
  })

  it('flags EMAIL_FROM missing when a provider is set', () => {
    const env = validProdEnv()
    delete env.EMAIL_FROM
    expect(collectProductionConfigErrors(env).some((e) => e.includes('EMAIL_FROM'))).toBe(true)
  })

  it('flags a missing or localhost APP_BASE_URL (verify links would point at localhost)', () => {
    const env = validProdEnv()
    delete env.APP_BASE_URL
    expect(collectProductionConfigErrors(env).some((e) => e.includes('APP_BASE_URL'))).toBe(true)

    env.APP_BASE_URL = 'http://localhost:3000'
    expect(collectProductionConfigErrors(env).some((e) => e.includes('APP_BASE_URL'))).toBe(true)

    env.APP_BASE_URL = 'http://127.0.0.1:3000'
    expect(collectProductionConfigErrors(env).some((e) => e.includes('APP_BASE_URL'))).toBe(true)

    // A legit domain that merely contains "localhost" as a substring must NOT be rejected.
    env.APP_BASE_URL = 'https://localhost-tools.com'
    expect(collectProductionConfigErrors(env).some((e) => e.includes('APP_BASE_URL'))).toBe(false)
  })

  it('flags missing Supabase config', () => {
    const env = validProdEnv()
    delete env.SUPABASE_SERVICE_ROLE_KEY
    delete env.SUPABASE_ANON_KEY
    const errors = collectProductionConfigErrors(env)
    expect(errors.some((e) => e.includes('SUPABASE_SERVICE_ROLE_KEY'))).toBe(true)
    expect(errors.some((e) => e.includes('SUPABASE_ANON_KEY'))).toBe(true)
  })

  it('does NOT error on missing maker credentials (dashboard is optional)', () => {
    const env = validProdEnv()
    delete env.MAKER_EMAIL
    delete env.MAKER_PASSWORD
    expect(collectProductionConfigErrors(env)).toEqual([])
  })
})
