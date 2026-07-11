import { test, expect, describe } from 'vitest'
import { computePositions, type SignupRow } from './position'

function s(id: string, referrals: number, verifiedAtIso: string): SignupRow {
  return { id, confirmedReferrals: referrals, verifiedAt: new Date(verifiedAtIso) }
}

describe('computePositions', () => {
  test('orders by referral count desc, then verified_at asc', () => {
    const rows = [
      s('a', 0, '2026-01-01T00:00:00Z'),
      s('b', 2, '2026-01-03T00:00:00Z'),
      s('c', 2, '2026-01-02T00:00:00Z'), // same referrals as b, earlier verify -> ahead
      s('d', 1, '2026-01-01T00:00:00Z'),
    ]
    const pos = computePositions(rows)
    expect(pos.get('c')).toBe(1) // 2 referrals, earliest of the two
    expect(pos.get('b')).toBe(2) // 2 referrals, later
    expect(pos.get('d')).toBe(3) // 1 referral
    expect(pos.get('a')).toBe(4) // 0 referrals
  })

  test('positions are 1-indexed and contiguous', () => {
    const rows = [
      s('a', 0, '2026-01-01T00:00:00Z'),
      s('b', 0, '2026-01-02T00:00:00Z'),
      s('c', 0, '2026-01-03T00:00:00Z'),
    ]
    const pos = computePositions(rows)
    expect([...pos.values()].sort((x, y) => x - y)).toEqual([1, 2, 3])
  })

  test('empty input yields an empty map', () => {
    expect(computePositions([]).size).toBe(0)
  })

  test('ties on both keys are broken deterministically by id', () => {
    const t = '2026-01-01T00:00:00Z'
    const rows = [s('b', 1, t), s('a', 1, t)]
    const pos = computePositions(rows)
    expect(pos.get('a')).toBe(1) // 'a' < 'b'
    expect(pos.get('b')).toBe(2)
  })
})
