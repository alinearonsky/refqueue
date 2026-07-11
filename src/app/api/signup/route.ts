import { NextResponse } from 'next/server'
import { signupInputSchema } from '@/lib/validation'
import { isDisposableEmail } from '@/lib/antiabuse/disposable'
import { InMemoryRateLimiter } from '@/lib/antiabuse/ratelimit'
import { createServiceClient } from '@/lib/db/client'
import { getWaitlistBySlug } from '@/lib/db/waitlists'
import { createSignup, countConfirmedReferrals, listVerifiedSignups } from '@/lib/db/signups'
import { computePositions } from '@/lib/referral/position'
import { getEmailSender } from '@/lib/email'
import { buildConfirmationEmail } from '@/lib/email/templates'

// Module-scoped limiter: 5 signups / 10 min / IP. Plan 6 swaps in a shared store.
const limiter = new InMemoryRateLimiter({ max: 5, windowMs: 10 * 60_000 })

// Rate-limit key is derived from x-forwarded-for. RefQueue must be deployed behind a
// reverse proxy (Vercel, or nginx/Caddy for Docker self-hosters) that OVERWRITES this
// header with the real client IP — otherwise the value is client-spoofable, and if the
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
  // fail the signup — the row exists and re-signing up re-sends). Awaited so it
  // completes before the serverless function returns.
  if (!signup.verified && signup.verify_token) {
    const base = process.env.APP_BASE_URL ?? 'http://localhost:3000'
    const verifyUrl = `${base}/api/verify?token=${signup.verify_token}`
    const confirmation = buildConfirmationEmail({ waitlistName: waitlist.name, verifyUrl })
    try {
      await getEmailSender().send({ to: signup.email, subject: confirmation.subject, html: confirmation.html })
    } catch (err) {
      console.error('signup: confirmation email failed to send', err)
    }
  }

  // Compute this signup's current position across verified signups (+ itself if verified).
  const verified = await listVerifiedSignups(db, waitlist.id)
  const withCounts = await Promise.all(
    verified.map(async r => ({
      id: r.id,
      confirmedReferrals: await countConfirmedReferrals(db, r.id),
      verifiedAt: new Date(r.verified_at as string),
    })),
  )
  const position = computePositions(withCounts).get(signup.id) ?? verified.length + 1

  return NextResponse.json({
    referralCode: signup.referral_code,
    verified: signup.verified,
    position,
  })
}
