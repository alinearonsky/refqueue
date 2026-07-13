import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/db/client'
import { verifySignup } from '@/lib/db/signups'
import { getAppBaseUrl } from '@/lib/config'
import { getEmailSender } from '@/lib/email'
import { notifyReferrerMilestone } from '@/lib/notifications/milestone'

export async function GET(req: Request) {
  const base = getAppBaseUrl()
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.redirect(`${base}/?verify=invalid`, 303)

  const db = createServiceClient()
  const result = await verifySignup(db, token)
  if (!result) return NextResponse.redirect(`${base}/?verify=invalid`, 303)

  if (!result.alreadyVerified) {
    // Best-effort milestone notification to the referrer (never fail verification on it).
    // Guarded by alreadyVerified so a scanner-prefetch + real-click pair emails once.
    try {
      await notifyReferrerMilestone(db, getEmailSender(), result.signup)
    } catch (err) {
      console.error('verify: milestone notification failed', err)
    }
  }

  const suffix = result.alreadyVerified ? '' : '?welcome=1'
  return NextResponse.redirect(`${base}/status/${result.signup.referral_code}${suffix}`, 303)
}
