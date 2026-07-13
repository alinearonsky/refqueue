import { test, expect, describe, beforeEach } from 'vitest'
import { createServiceClient } from '@/lib/db/client'
import { createWaitlistForTest, createSignup, verifySignup } from '@/lib/db/signups'
import { getWaitlistById } from '@/lib/db/waitlists'
import { getSignupStatus } from './status'

const db = createServiceClient()
async function reset() {
  await db.from('signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('waitlists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

describe('getSignupStatus (integration)', () => {
  beforeEach(reset)

  test('a confirmed referral moves the referrer ahead of an earlier-verified signup', async () => {
    const wl = await createWaitlistForTest(db, 'st1', [
      { referrals: 1, label: 'Early access' },
      { referrals: 3, label: 'Founding member' },
    ])
    const waitlist = (await getWaitlistById(db, wl.id))!

    // "other" verifies FIRST — wins the time tiebreak until referrals say otherwise
    const other = await createSignup(db, { waitlistId: wl.id, email: 'other@example.com' })
    await verifySignup(db, other.verify_token!)
    const referrer = await createSignup(db, { waitlistId: wl.id, email: 'ref@example.com' })
    await verifySignup(db, referrer.verify_token!)

    const before = await getSignupStatus(db, waitlist, referrer)
    expect(before.position).toBe(2)
    expect(before.confirmedReferrals).toBe(0)

    const friend = await createSignup(db, { waitlistId: wl.id, email: 'friend@example.com', referrerCode: referrer.referral_code })
    await verifySignup(db, friend.verify_token!)

    const after = await getSignupStatus(db, waitlist, referrer)
    expect(after.position).toBe(1)
    expect(after.confirmedReferrals).toBe(1)
    expect(after.rewards.unlocked).toEqual([{ referrals: 1, label: 'Early access' }])
    expect(after.rewards.next).toEqual({ referrals: 3, label: 'Founding member' })
    expect(after.rewards.toNext).toBe(2)
    const base = process.env.APP_BASE_URL ?? 'http://localhost:3000'
    expect(after.referralLink).toBe(`${base}/?ref=${referrer.referral_code}`)
  })

  test('an unverified signup gets the back-of-line fallback position', async () => {
    const wl = await createWaitlistForTest(db, 'st2')
    const waitlist = (await getWaitlistById(db, wl.id))!
    const v = await createSignup(db, { waitlistId: wl.id, email: 'v@example.com' })
    await verifySignup(db, v.verify_token!)
    const pending = await createSignup(db, { waitlistId: wl.id, email: 'p@example.com' })

    const status = await getSignupStatus(db, waitlist, pending)
    expect(status.position).toBe(2) // 1 verified + 1
    expect(status.rewards).toEqual({ unlocked: [], next: null, toNext: 0 })
  })
})
