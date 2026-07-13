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
