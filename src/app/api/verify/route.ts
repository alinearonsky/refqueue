import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/db/client'
import { verifySignup } from '@/lib/db/signups'

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 })

  const db = createServiceClient()
  const signup = await verifySignup(db, token)
  if (!signup) return NextResponse.json({ error: 'invalid_or_used_token' }, { status: 410 })

  return NextResponse.json({ verified: true, referralCode: signup.referral_code })
}
