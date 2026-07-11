import { test, expect, describe, beforeEach } from 'vitest'
import { createServiceClient } from './client'
import { createWaitlistForTest, createSignup, verifySignup, countConfirmedReferrals, getSignupByCode } from './signups'

const db = createServiceClient()

async function reset() {
  await db.from('signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('waitlists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

describe('signups repository (integration)', () => {
  beforeEach(reset)

  test('createSignup issues a referral code and stores unverified', async () => {
    const wl = await createWaitlistForTest(db, 'app-a')
    const s = await createSignup(db, { waitlistId: wl.id, email: 'a@example.com' })
    expect(s.referral_code).toMatch(/^[0-9A-Za-z_-]{8}$/)
    expect(s.verified).toBe(false)
    expect(s.verify_token).toBeTruthy()
  })

  test('same email on same waitlist is idempotent', async () => {
    const wl = await createWaitlistForTest(db, 'app-b')
    const first = await createSignup(db, { waitlistId: wl.id, email: 'dup@example.com' })
    const second = await createSignup(db, { waitlistId: wl.id, email: 'dup@example.com' })
    expect(second.id).toBe(first.id)
  })

  test('referred_by is set when the referrer code exists on the waitlist', async () => {
    const wl = await createWaitlistForTest(db, 'app-c')
    const referrer = await createSignup(db, { waitlistId: wl.id, email: 'ref@example.com' })
    const referred = await createSignup(db, {
      waitlistId: wl.id, email: 'new@example.com', referrerCode: referrer.referral_code,
    })
    expect(referred.referred_by).toBe(referrer.id)
  })

  test('referred_by is null when the referrer code is unknown', async () => {
    const wl = await createWaitlistForTest(db, 'app-d')
    const referred = await createSignup(db, {
      waitlistId: wl.id, email: 'x@example.com', referrerCode: 'ZZZZZZZZ',
    })
    expect(referred.referred_by).toBeNull()
  })

  test('countConfirmedReferrals counts only verified referred signups', async () => {
    const wl = await createWaitlistForTest(db, 'app-e')
    const referrer = await createSignup(db, { waitlistId: wl.id, email: 'r@example.com' })
    const a = await createSignup(db, { waitlistId: wl.id, email: 'a@example.com', referrerCode: referrer.referral_code })
    await createSignup(db, { waitlistId: wl.id, email: 'b@example.com', referrerCode: referrer.referral_code })
    // Only `a` verifies.
    await verifySignup(db, a.verify_token!)
    expect(await countConfirmedReferrals(db, referrer.id)).toBe(1)
  })

  test('verifySignup is idempotent and clears the token', async () => {
    const wl = await createWaitlistForTest(db, 'app-f')
    const s = await createSignup(db, { waitlistId: wl.id, email: 'v@example.com' })
    const token = s.verify_token!
    const first = await verifySignup(db, token)
    expect(first?.verified).toBe(true)
    expect(first?.verify_token).toBeNull()
    const again = await verifySignup(db, token) // token already cleared
    expect(again).toBeNull()
    // The signup stays verified.
    const still = await getSignupByCode(db, wl.id, s.referral_code)
    expect(still?.verified).toBe(true)
  })
})
