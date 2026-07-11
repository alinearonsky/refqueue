import { NextResponse } from 'next/server'
import { signupInputSchema } from '@/lib/validation'
import { isDisposableEmail } from '@/lib/antiabuse/disposable'
import { InMemoryRateLimiter } from '@/lib/antiabuse/ratelimit'
import { createServiceClient } from '@/lib/db/client'
import { getWaitlistBySlug } from '@/lib/db/waitlists'
import { createSignup, countConfirmedReferrals } from '@/lib/db/signups'
import { computePositions } from '@/lib/referral/position'

// Module-scoped limiter: 5 signups / 10 min / IP. Plan 6 swaps in a shared store.
const limiter = new InMemoryRateLimiter({ max: 5, windowMs: 10 * 60_000 })

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

  // Compute this signup's current position across verified signups (+ itself if verified).
  const { data: rows } = await db
    .from('signups')
    .select('id, verified, verified_at, referred_by')
    .eq('waitlist_id', waitlist.id)
  const verified = (rows ?? []).filter(r => r.verified)
  const withCounts = await Promise.all(
    verified.map(async r => ({
      id: r.id as string,
      confirmedReferrals: await countConfirmedReferrals(db, r.id as string),
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
