import { test, expect, describe, beforeEach } from 'vitest'
import { createServiceClient } from '@/lib/db/client'
import { createWaitlistForTest, createSignup, verifySignup } from '@/lib/db/signups'
import { FakeEmailSender } from '@/lib/email/fake'
import { notifyReferrerMilestone } from './milestone'

const db = createServiceClient()
async function reset() {
  await db.from('signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('waitlists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

describe('notifyReferrerMilestone (integration)', () => {
  beforeEach(reset)

  test('emails the referrer when their confirmed count hits a reward tier', async () => {
    const wl = await createWaitlistForTest(db, 'ms-a', [{ referrals: 1, label: 'Early access' }])
    const referrer = await createSignup(db, { waitlistId: wl.id, email: 'ref@example.com' })
    const referred = await createSignup(db, { waitlistId: wl.id, email: 'new@example.com', referrerCode: referrer.referral_code })
    const verified = await verifySignup(db, referred.verify_token!)
    const fake = new FakeEmailSender()
    await notifyReferrerMilestone(db, fake, verified!)
    expect(fake.sent).toHaveLength(1)
    expect(fake.sent[0].to).toBe('ref@example.com')
    expect(fake.sent[0].subject).toContain('Early access')
  })

  test('sends nothing when the verified signup was not referred', async () => {
    const wl = await createWaitlistForTest(db, 'ms-b', [{ referrals: 1, label: 'Early access' }])
    const s = await createSignup(db, { waitlistId: wl.id, email: 'solo@example.com' })
    const verified = await verifySignup(db, s.verify_token!)
    const fake = new FakeEmailSender()
    await notifyReferrerMilestone(db, fake, verified!)
    expect(fake.sent).toHaveLength(0)
  })

  test('sends nothing when the new count does not match any tier', async () => {
    const wl = await createWaitlistForTest(db, 'ms-c', [{ referrals: 5, label: 'Founding member' }])
    const referrer = await createSignup(db, { waitlistId: wl.id, email: 'ref@example.com' })
    const referred = await createSignup(db, { waitlistId: wl.id, email: 'new@example.com', referrerCode: referrer.referral_code })
    const verified = await verifySignup(db, referred.verify_token!)
    const fake = new FakeEmailSender()
    await notifyReferrerMilestone(db, fake, verified!)
    expect(fake.sent).toHaveLength(0)
  })
})
