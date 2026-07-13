import { NextResponse } from 'next/server'
import { createAuthClient } from '@/lib/auth/server'
import { getAppBaseUrl } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createAuthClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(`${getAppBaseUrl()}/login`, 303)
}
