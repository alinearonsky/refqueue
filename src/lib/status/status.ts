import type { SupabaseClient } from '@supabase/supabase-js'
import type { WaitlistRecord } from '@/lib/db/waitlists'
import type { SignupRecord } from '@/lib/db/signups'
import { listVerifiedSignups } from '@/lib/db/signups'
import { computePositions, tallyConfirmedReferrals, resolveRewards, type RewardStatus } from '@/lib/referral/position'
import { buildReferralLink } from '@/lib/referral/share'

export interface SignupStatus {
  position: number
  confirmedReferrals: number
  rewards: RewardStatus
  referralLink: string
}

/**
 * Everything the visitor-facing surfaces show about one signup, from a single
 * verified-signups query. Unverified signups fall back to back-of-line
 * (verified count + 1) — same behavior the signup route had in Plan 1.
 */
export async function getSignupStatus(
  db: SupabaseClient,
  waitlist: WaitlistRecord,
  signup: SignupRecord,
): Promise<SignupStatus> {
  const verified = await listVerifiedSignups(db, waitlist.id)
  const counts = tallyConfirmedReferrals(verified)
  const rows = verified.map(r => ({
    id: r.id,
    confirmedReferrals: counts.get(r.id) ?? 0,
    verifiedAt: new Date(r.verified_at as string),
  }))
  const confirmedReferrals = counts.get(signup.id) ?? 0
  return {
    position: computePositions(rows).get(signup.id) ?? verified.length + 1,
    confirmedReferrals,
    rewards: resolveRewards(confirmedReferrals, waitlist.reward_tiers),
    referralLink: buildReferralLink(signup.referral_code),
  }
}
