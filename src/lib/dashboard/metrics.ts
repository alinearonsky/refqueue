import { computePositions, tallyConfirmedReferrals } from '@/lib/referral/position'

/** The subset of SignupRecord the dashboard consumes (structurally satisfied by it). */
export interface DashboardSignupRow {
  id: string
  email: string
  verified: boolean
  referral_code: string
  referred_by: string | null
  created_at: string
  verified_at: string | null
}

export interface DashboardEntry {
  email: string
  verified: boolean
  /** 1-based queue position; null until verified. */
  position: number | null
  confirmedReferrals: number
  referralCode: string
  createdAt: string
  verifiedAt: string | null
}

export interface TopReferrer {
  email: string
  confirmedReferrals: number
}

export interface DayBucket {
  /** UTC day, YYYY-MM-DD. */
  day: string
  count: number
}

export interface DashboardData {
  total: number
  verifiedCount: number
  pendingCount: number
  /** Verified by position asc, then pending oldest-first. Feeds the table AND the CSV. */
  entries: DashboardEntry[]
  /** Top 5 by confirmed referrals, zero-referral signups excluded. */
  topReferrers: TopReferrer[]
  /** Last `CHART_DAYS` UTC days, oldest first, zero-filled. */
  signupsPerDay: DayBucket[]
}

export const CHART_DAYS = 30

const DAY_MS = 86_400_000

export function buildDashboardData(rows: DashboardSignupRow[], now: Date): DashboardData {
  const verified = rows.filter((r) => r.verified && r.verified_at !== null)

  // Confirmed = the referred signup itself verified (the anti-gaming spine).
  const tally = tallyConfirmedReferrals(verified)
  const positions = computePositions(
    verified.map((r) => ({
      id: r.id,
      confirmedReferrals: tally.get(r.id) ?? 0,
      verifiedAt: new Date(r.verified_at as string),
    })),
  )

  const toEntry = (r: DashboardSignupRow): DashboardEntry => ({
    email: r.email,
    verified: r.verified,
    position: positions.get(r.id) ?? null,
    confirmedReferrals: tally.get(r.id) ?? 0,
    referralCode: r.referral_code,
    createdAt: r.created_at,
    verifiedAt: r.verified_at,
  })

  const entries = [
    ...verified.map(toEntry).sort((a, b) => (a.position as number) - (b.position as number)),
    ...rows.filter((r) => !r.verified).map(toEntry),
  ]

  const byId = new Map(rows.map((r) => [r.id, r]))
  const topReferrers = [...tally.entries()]
    .sort(([idA, countA], [idB, countB]) => countB - countA || idA.localeCompare(idB))
    .slice(0, 5)
    .map(([id, confirmedReferrals]) => ({
      email: byId.get(id)?.email ?? '(unknown)',
      confirmedReferrals,
    }))

  const signupsPerDay: DayBucket[] = []
  for (let i = CHART_DAYS - 1; i >= 0; i--) {
    signupsPerDay.push({ day: new Date(now.getTime() - i * DAY_MS).toISOString().slice(0, 10), count: 0 })
  }
  const bucketByDay = new Map(signupsPerDay.map((b) => [b.day, b]))
  for (const r of rows) {
    const bucket = bucketByDay.get(r.created_at.slice(0, 10))
    if (bucket) bucket.count += 1
  }

  return {
    total: rows.length,
    verifiedCount: verified.length,
    pendingCount: rows.length - verified.length,
    entries,
    topReferrers,
    signupsPerDay,
  }
}
