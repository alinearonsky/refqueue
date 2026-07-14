import { NextResponse } from 'next/server'
import { signupInputSchema } from '@/lib/validation'
import { isDisposableEmail } from '@/lib/antiabuse/disposable'
import { InMemoryRateLimiter } from '@/lib/antiabuse/ratelimit'
import { createServiceClient } from '@/lib/db/client'
import { getWaitlistBySlug } from '@/lib/db/waitlists'
import { createSignup } from '@/lib/db/signups'
import { getSignupStatus } from '@/lib/status/status'
import { getAppBaseUrl } from '@/lib/config'
import { getEmailSender } from '@/lib/email'
import { buildConfirmationEmail } from '@/lib/email/templates'

// Module-scoped limiter: 5 signups / 10 min / IP. Plan 6 swaps in a shared store.
const limiter = new InMemoryRateLimiter({ max: 5, windowMs: 10 * 60_000 })

// Rate-limit key is derived from x-forwarded-for. RefQueue must be deployed behind a
// reverse proxy (Vercel, or nginx/Caddy for Docker self-hosters) that OVERWRITES this
// header with the real client IP, otherwise the value is client-spoofable, and if the
// header is absent all traffic collapses into a single 'unknown' bucket. Trusted-proxy
// config and a shared/distributed limiter are handled in Plan 6 (deploy).
function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
}

export async function POST(req: Request) {
  const parsed = signupInputSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  const { waitlistSlug, email, ref } = parsed.data

  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: 'disposable_email' }, { status: 422 })
  }
  if (!(await limiter.allow(`signup:${clientIp(req)}`))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }

  const db = createServiceClient()
  const waitlist = await getWaitlistBySlug(db, waitlistSlug)
  if (!waitlist) return NextResponse.json({ error: 'waitlist_not_found' }, { status: 404 })

  const signup = await createSignup(db, { waitlistId: waitlist.id, email, referrerCode: ref })

  // Send the double-opt-in confirmation email (best-effort; a send failure must not
  // fail the signup, the row exists and re-signing up re-sends). Awaited so it
  // completes before the serverless function returns.
  if (!signup.verified && signup.verify_token) {
    const verifyUrl = `${getAppBaseUrl()}/api/verify?token=${signup.verify_token}`
    const confirmation = buildConfirmationEmail({ waitlistName: waitlist.name, verifyUrl })
    try {
      await getEmailSender().send({ to: signup.email, subject: confirmation.subject, html: confirmation.html })
    } catch (err) {
      console.error('signup: confirmation email failed to send', err)
    }
  }

  const status = await getSignupStatus(db, waitlist, signup)
  return NextResponse.json({
    referralCode: signup.referral_code,
    verified: signup.verified,
    position: status.position,
    referralLink: status.referralLink,
    rewards: status.rewards,
  })
}
