import { describe, expect, it } from 'vitest'
import { buildDashboardData, type DashboardSignupRow } from './metrics'

const NOW = new Date('2026-07-13T12:00:00Z')

function row(overrides: Partial<DashboardSignupRow> & { id: string; email: string }): DashboardSignupRow {
  return {
    verified: false,
    referral_code: `code-${overrides.id}`,
    referred_by: null,
    created_at: '2026-07-10T10:00:00Z',
    verified_at: null,
    ...overrides,
  }
}

describe('buildDashboardData', () => {
  it('handles an empty waitlist', () => {
    const data = buildDashboardData([], NOW)
    expect(data.total).toBe(0)
    expect(data.verifiedCount).toBe(0)
    expect(data.pendingCount).toBe(0)
    expect(data.entries).toEqual([])
    expect(data.topReferrers).toEqual([])
    expect(data.signupsPerDay).toHaveLength(30)
    expect(data.signupsPerDay.every((b) => b.count === 0)).toBe(true)
    expect(data.signupsPerDay[29].day).toBe('2026-07-13')
    expect(data.signupsPerDay[0].day).toBe('2026-06-14')
  })

  it('orders verified entries by position, then pending by signup date; counts only verified referrals', () => {
    const rows = [
      // a: verified early, no referrals
      row({ id: 'a', email: 'a@x.com', verified: true, verified_at: '2026-07-10T10:00:00Z' }),
      // b: verified later but has 2 confirmed referrals -> position 1
      row({ id: 'b', email: 'b@x.com', verified: true, verified_at: '2026-07-11T10:00:00Z' }),
      row({ id: 'c', email: 'c@x.com', verified: true, verified_at: '2026-07-12T10:00:00Z', referred_by: 'b' }),
      row({ id: 'd', email: 'd@x.com', verified: true, verified_at: '2026-07-12T11:00:00Z', referred_by: 'b' }),
      // e: referred by b but NOT verified -> does not count, listed after all verified
      row({ id: 'e', email: 'e@x.com', referred_by: 'b', created_at: '2026-07-12T12:00:00Z' }),
    ]

    const data = buildDashboardData(rows, NOW)

    expect(data.total).toBe(5)
    expect(data.verifiedCount).toBe(4)
    expect(data.pendingCount).toBe(1)

    expect(data.entries.map((e) => e.email)).toEqual(['b@x.com', 'a@x.com', 'c@x.com', 'd@x.com', 'e@x.com'])
    expect(data.entries[0]).toMatchObject({ position: 1, confirmedReferrals: 2, verified: true })
    expect(data.entries[4]).toMatchObject({ email: 'e@x.com', position: null, verified: false })
    expect(data.entries[0].referralCode).toBe('code-b')

    expect(data.topReferrers).toEqual([{ email: 'b@x.com', confirmedReferrals: 2 }])
  })

  it('caps topReferrers at 5 and excludes zero-referral signups', () => {
    const rows: DashboardSignupRow[] = []
    for (let i = 0; i < 7; i++) {
      rows.push(row({ id: `ref-${i}`, email: `ref-${i}@x.com`, verified: true, verified_at: '2026-07-10T10:00:00Z' }))
      for (let j = 0; j <= i; j++) {
        rows.push(
          row({
            id: `child-${i}-${j}`,
            email: `child-${i}-${j}@x.com`,
            verified: true,
            verified_at: '2026-07-11T10:00:00Z',
            referred_by: `ref-${i}`,
          }),
        )
      }
    }

    const { topReferrers } = buildDashboardData(rows, NOW)

    expect(topReferrers).toHaveLength(5)
    expect(topReferrers[0]).toEqual({ email: 'ref-6@x.com', confirmedReferrals: 7 })
    expect(topReferrers[4]).toEqual({ email: 'ref-2@x.com', confirmedReferrals: 3 })
  })

  it('buckets signups per day over the last 30 days, dropping older rows', () => {
    const rows = [
      row({ id: 'old', email: 'old@x.com', created_at: '2026-05-01T10:00:00Z' }),
      row({ id: 'd1', email: 'd1@x.com', created_at: '2026-07-13T01:00:00Z' }),
      row({ id: 'd2', email: 'd2@x.com', created_at: '2026-07-13T23:00:00Z' }),
      row({ id: 'd3', email: 'd3@x.com', created_at: '2026-06-14T00:30:00Z' }),
    ]

    const { signupsPerDay } = buildDashboardData(rows, NOW)

    expect(signupsPerDay[29]).toEqual({ day: '2026-07-13', count: 2 })
    expect(signupsPerDay[0]).toEqual({ day: '2026-06-14', count: 1 })
    expect(signupsPerDay.reduce((sum, b) => sum + b.count, 0)).toBe(3)
  })
})
