import { test, expect, describe, beforeEach, afterEach } from 'vitest'
import { GET } from './route'
import { createServiceClient } from '@/lib/db/client'
import { createWaitlistForTest, createSignup } from '@/lib/db/signups'
import { FakeEmailSender } from '@/lib/email/fake'
import { setEmailSenderForTest } from '@/lib/email'

const db = createServiceClient()
async function reset() {
  await db.from('signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('waitlists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}
const verifyReq = (token: string) => new Request(`http://localhost/api/verify?token=${token}`)

describe('GET /api/verify (integration)', () => {
  beforeEach(reset)

  let fakeEmail: FakeEmailSender
  beforeEach(() => {
    fakeEmail = new FakeEmailSender()
    setEmailSenderForTest(fakeEmail)
  })
  afterEach(() => setEmailSenderForTest(null))

  test('valid token verifies the signup and returns 200', async () => {
    const wl = await createWaitlistForTest(db, 'v1')
    const s = await createSignup(db, { waitlistId: wl.id, email: 'a@example.com' })
    const res = await GET(verifyReq(s.verify_token!))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.verified).toBe(true)
  })

  test('missing token returns 400', async () => {
    const res = await GET(new Request('http://localhost/api/verify'))
    expect(res.status).toBe(400)
  })

  test('already-used or unknown token returns 410', async () => {
    const res = await GET(verifyReq('deadbeefdeadbeefdeadbeefdeadbeef'))
    expect(res.status).toBe(410)
  })

  test('verifying a referred signup emails the referrer their tier unlock', async () => {
    const wl = await createWaitlistForTest(db, 'v-ms', [{ referrals: 1, label: 'Early access' }])
    const referrer = await createSignup(db, { waitlistId: wl.id, email: 'ref@example.com' })
    const referred = await createSignup(db, { waitlistId: wl.id, email: 'friend@example.com', referrerCode: referrer.referral_code })
    const res = await GET(verifyReq(referred.verify_token!))
    expect(res.status).toBe(200)
    expect(fakeEmail.sent.some(m => m.to === 'ref@example.com' && m.subject.includes('Early access'))).toBe(true)
  })
})
