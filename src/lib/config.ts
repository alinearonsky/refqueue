import { z } from 'zod'
import type { RewardTier } from '@/lib/referral/position'

/**
 * Single reader of the instance-level env config (env is v1's only config surface).
 * WAITLIST_SLUG/WAITLIST_NAME identify the one waitlist this instance hosts;
 * the row is auto-provisioned from these on landing-page render (ensureWaitlist).
 */
export function getWaitlistConfig(): { slug: string; name: string } {
  return {
    slug: process.env.WAITLIST_SLUG ?? 'default',
    name: process.env.WAITLIST_NAME ?? 'Waitlist',
  }
}

export function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL ?? 'http://localhost:3000'
}

/** Anon (publishable) key — used ONLY for Supabase Auth sessions, never for data access. */
export function getSupabaseAnonKey(): string {
  const key = process.env.SUPABASE_ANON_KEY
  if (!key) throw new Error('SUPABASE_ANON_KEY must be set')
  return key
}

/**
 * Session-cookie hardening for both @supabase/ssr call sites (auth/server.ts,
 * middleware.ts). The library defaults to httpOnly: false to serve
 * createBrowserClient, which this app never uses. `secure` follows the
 * deployment's actual scheme so plain-HTTP LAN self-hosts still work.
 */
export function sessionCookieOptions(): { httpOnly: boolean; secure: boolean } {
  return { httpOnly: true, secure: getAppBaseUrl().startsWith('https://') }
}

/**
 * The single maker account, provisioned from env (env is v1's only config surface).
 * null = dashboard disabled (login page explains which vars to set).
 */
export function getMakerCredentials(): { email: string; password: string } | null {
  const email = process.env.MAKER_EMAIL
  const password = process.env.MAKER_PASSWORD
  if (!email || !password) return null
  return { email, password }
}

const rewardTiersSchema = z.array(
  z.object({ referrals: z.number().int().positive(), label: z.string().trim().min(1) }),
)

/**
 * Reward tiers from env (JSON array), synced into the waitlist row by
 * ensureWaitlist. Fail-safe: a malformed value warns and falls back to [] —
 * the landing page must never 500 on a config typo.
 */
export function getRewardTiersConfig(): RewardTier[] {
  const raw = process.env.REWARD_TIERS
  if (!raw) return []
  try {
    const tiers = rewardTiersSchema.parse(JSON.parse(raw))
    return [...tiers].sort((a, b) => a.referrals - b.referrals)
  } catch {
    console.warn('REWARD_TIERS is not a valid JSON tier array — ignoring it.')
    return []
  }
}

/** "Powered by RefQueue" credit — on unless the maker explicitly sets "false" (PRODUCT.md default-on). */
export function getPoweredByConfig(): boolean {
  return process.env.POWERED_BY !== 'false'
}

export interface ThemeConfig {
  accentColor?: string
  logoUrl?: string
  headline?: string
  subhead?: string
  ctaLabel?: string
}

// Hex-only: this value lands in a style attribute, so the regex doubles as the injection guard.
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Presentation-only theme from env; read at render, never stored. Invalid values warn and drop. */
export function getThemeConfig(): ThemeConfig {
  const theme: ThemeConfig = {}

  const accent = process.env.THEME_ACCENT_COLOR
  if (accent) {
    if (HEX_COLOR.test(accent)) theme.accentColor = accent
    else console.warn('THEME_ACCENT_COLOR must be a #rgb or #rrggbb hex color — ignoring it.')
  }

  const logo = process.env.THEME_LOGO_URL
  if (logo) {
    if (/^https?:\/\//i.test(logo)) theme.logoUrl = logo
    else console.warn('THEME_LOGO_URL must be an http(s) URL — ignoring it.')
  }

  if (process.env.THEME_HEADLINE) theme.headline = process.env.THEME_HEADLINE
  if (process.env.THEME_SUBHEAD) theme.subhead = process.env.THEME_SUBHEAD
  if (process.env.THEME_CTA_LABEL) theme.ctaLabel = process.env.THEME_CTA_LABEL

  return theme
}
