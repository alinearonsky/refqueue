import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/auth/server'
import { getAppBaseUrl } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const base = getAppBaseUrl()
  const form = await req.formData()
  const email = form.get('email')
  const password = form.get('password')

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return NextResponse.redirect(`${base}/login?error=1`, 303)
  }

  const supabase = await createAuthClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.redirect(`${base}/login?error=1`, 303)

  return NextResponse.redirect(`${base}/dashboard`, 303)
}
