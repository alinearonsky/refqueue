import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/db/client'
import { verifySignup } from '@/lib/db/signups'
import { getEmailSender } from '@/lib/email'
import { notifyReferrerMilestone } from '@/lib/notifications/milestone'

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 })

  const db = createServiceClient()
  const result = await verifySignup(db, token)
  if (!result) return NextResponse.json({ error: 'invalid_or_used_token' }, { status: 410 })
  const signup = result.signup

  // Best-effort milestone notification to the referrer (never fail verification on it).
  try {
    await notifyReferrerMilestone(db, getEmailSender(), signup)
  } catch (err) {
    console.error('verify: milestone notification failed', err)
  }

  return NextResponse.json({ verified: true, referralCode: signup.referral_code })
}
