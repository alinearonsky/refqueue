import { NextResponse } from 'next/server'
import { getMakerUser } from '@/lib/auth/server'
import { getWaitlistConfig } from '@/lib/config'
import { signupsToCsv } from '@/lib/dashboard/csv'
import { buildDashboardData } from '@/lib/dashboard/metrics'
import { createServiceClient } from '@/lib/db/client'
import { listAllSignups } from '@/lib/db/signups'
import { getWaitlistBySlug } from '@/lib/db/waitlists'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await getMakerUser())) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const db = createServiceClient()
  const waitlist = await getWaitlistBySlug(db, getWaitlistConfig().slug)
  const rows = waitlist ? await listAllSignups(db, waitlist.id) : []
  const csv = signupsToCsv(buildDashboardData(rows, new Date()).entries)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="signups.csv"',
      // Bulk PII download, never let a browser or intermediary cache it.
      'Cache-Control': 'no-store',
    },
  })
}
