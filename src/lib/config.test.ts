import { afterEach, describe, expect, it } from 'vitest'
import {
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
  })
})
