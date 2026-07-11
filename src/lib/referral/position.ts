export interface SignupRow {
  id: string
  confirmedReferrals: number
  verifiedAt: Date
}

/**
 * Returns a map of signup id -> 1-indexed position.
 * Order: confirmed referrals desc, then verifiedAt asc, then id asc (deterministic tiebreak).
 */
export function computePositions(rows: SignupRow[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => {
    if (a.confirmedReferrals !== b.confirmedReferrals) {
      return b.confirmedReferrals - a.confirmedReferrals
    }
    const ta = a.verifiedAt.getTime()
    const tb = b.verifiedAt.getTime()
    if (ta !== tb) return ta - tb
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
  const positions = new Map<string, number>()
  sorted.forEach((row, i) => positions.set(row.id, i + 1))
  return positions
}

export interface RewardTier {
  referrals: number
  label: string
}

export interface RewardStatus {
  unlocked: RewardTier[]
  next: RewardTier | null
  toNext: number // referrals still needed to reach `next` (0 if none)
}

export function resolveRewards(confirmedReferrals: number, tiers: RewardTier[]): RewardStatus {
  const sorted = [...tiers].sort((a, b) => a.referrals - b.referrals)
  const unlocked = sorted.filter(t => confirmedReferrals >= t.referrals)
  const next = sorted.find(t => confirmedReferrals < t.referrals) ?? null
  return {
    unlocked,
    next,
    toNext: next ? next.referrals - confirmedReferrals : 0,
  }
}
