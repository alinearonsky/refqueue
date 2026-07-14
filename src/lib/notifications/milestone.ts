import type { SupabaseClient } from '@supabase/supabase-js'
import type { EmailSender } from '@/lib/email/types'
import type { SignupRecord } from '@/lib/db/signups'
import { getSignupById, countConfirmedReferrals } from '@/lib/db/signups'
import { getWaitlistById } from '@/lib/db/waitlists'
import { buildMilestoneEmail } from '@/lib/email/templates'

/**
 * Called right after a signup verifies. If that signup was referred, its referrer's
 * confirmed-referral count just increased by exactly one (the verify route gates this call
 * on `alreadyVerified`, so it runs only on the first successful verify). A reward tier is *newly* unlocked precisely
 * when its threshold equals the new count, email the referrer once per such tier.
 */
export async function notifyReferrerMilestone(
  db: SupabaseClient,
  sender: EmailSender,
  verifiedSignup: SignupRecord,
): Promise<void> {
  if (!verifiedSignup.referred_by) return

  const referrer = await getSignupById(db, verifiedSignup.referred_by)
  if (!referrer) return

  const waitlist = await getWaitlistById(db, referrer.waitlist_id)
  if (!waitlist) return

  const tiers = waitlist.reward_tiers
  const count = await countConfirmedReferrals(db, referrer.id)
  const newlyUnlocked = tiers.filter(t => t.referrals === count)

  for (const tier of newlyUnlocked) {
    const email = buildMilestoneEmail({
      waitlistName: waitlist.name,
      unlockedLabel: tier.label,
      confirmedReferrals: count,
    })
    await sender.send({ to: referrer.email, subject: email.subject, html: email.html })
  }
}
