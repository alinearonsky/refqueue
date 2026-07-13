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
