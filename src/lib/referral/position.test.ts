import { test, expect, describe } from 'vitest'
import { computePositions, type SignupRow } from './position'
import { resolveRewards, type RewardTier } from './position'

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

describe('resolveRewards', () => {
  const tiers: RewardTier[] = [
    { referrals: 3, label: 'Early access' },
    { referrals: 10, label: 'Founding member' },
  ]
  test('reports unlocked tiers and the next target', () => {
    const r = resolveRewards(4, tiers)
    expect(r.unlocked.map(t => t.label)).toEqual(['Early access'])
    expect(r.next).toEqual({ referrals: 10, label: 'Founding member' })
    expect(r.toNext).toBe(6)
  })
  test('all unlocked -> next is null', () => {
    const r = resolveRewards(12, tiers)
    expect(r.unlocked.length).toBe(2)
    expect(r.next).toBeNull()
    expect(r.toNext).toBe(0)
  })
  test('none unlocked at zero referrals', () => {
    const r = resolveRewards(0, tiers)
    expect(r.unlocked).toEqual([])
    expect(r.next?.label).toBe('Early access')
    expect(r.toNext).toBe(3)
  })
  test('unsorted tiers are handled', () => {
    const r = resolveRewards(4, [{ referrals: 10, label: 'B' }, { referrals: 3, label: 'A' }])
    expect(r.unlocked.map(t => t.label)).toEqual(['A'])
    expect(r.next?.label).toBe('B')
  })
})
