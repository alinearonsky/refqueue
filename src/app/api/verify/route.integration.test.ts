import { test, expect, describe, beforeEach, afterEach } from 'vitest'
import { GET } from './route'
import { createServiceClient } from '@/lib/db/client'
import { createWaitlistForTest, createSignup, getSignupByCode } from '@/lib/db/signups'
import { FakeEmailSender } from '@/lib/email/fake'
import { setEmailSenderForTest } from '@/lib/email'
import { POST as signupPOST } from '@/app/api/signup/route'

const db = createServiceClient()
async function reset() {
  await db.from('signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('waitlists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}
const verifyReq = (token: string) => new Request(`http://localhost/api/verify?token=${token}`)
const base = process.env.APP_BASE_URL ?? 'http://localhost:3000'

describe('GET /api/verify (integration)', () => {
  beforeEach(reset)

  let fakeEmail: FakeEmailSender
  beforeEach(() => {
    fakeEmail = new FakeEmailSender()
    setEmailSenderForTest(fakeEmail)
  })
  afterEach(() => setEmailSenderForTest(null))

  test('first click verifies and 303-redirects to the status page with welcome', async () => {
    const wl = await createWaitlistForTest(db, 'v1')
    const s = await createSignup(db, { waitlistId: wl.id, email: 'a@example.com' })
    const res = await GET(verifyReq(s.verify_token!))
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(`${base}/status/${s.referral_code}?welcome=1`)
    const row = await getSignupByCode(db, wl.id, s.referral_code)
    expect(row!.verified).toBe(true)
  })

  test('second click (or scanner prefetch first) redirects without welcome and emails the referrer once', async () => {
    const wl = await createWaitlistForTest(db, 'v-pf', [{ referrals: 1, label: 'Early access' }])
    const referrer = await createSignup(db, { waitlistId: wl.id, email: 'ref@example.com' })
    const referred = await createSignup(db, { waitlistId: wl.id, email: 'friend@example.com', referrerCode: referrer.referral_code })

    const prefetch = await GET(verifyReq(referred.verify_token!)) // scanner consumes the link first
    const realClick = await GET(verifyReq(referred.verify_token!)) // then the human clicks

    expect(prefetch.status).toBe(303)
    expect(prefetch.headers.get('location')).toBe(`${base}/status/${referred.referral_code}?welcome=1`)
    expect(realClick.status).toBe(303)
    expect(realClick.headers.get('location')).toBe(`${base}/status/${referred.referral_code}`)
    expect(fakeEmail.sent.filter(m => m.to === 'ref@example.com')).toHaveLength(1)
  })

  test('missing token redirects to the landing page with an error flag', async () => {
    const res = await GET(new Request('http://localhost/api/verify'))
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(`${base}/?verify=invalid`)
  })

  test('unknown token redirects to the landing page with an error flag', async () => {
    const res = await GET(verifyReq('deadbeefdeadbeefdeadbeefdeadbeef'))
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(`${base}/?verify=invalid`)
  })

  test('a confirmed referral raises the referrer position through the API alone', async () => {
    const wl = await createWaitlistForTest(db, 'e2e')
    const signupReq = (email: string, ip: string, ref?: string) =>
      new Request('http://localhost/api/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
        body: JSON.stringify({ waitlistSlug: 'e2e', email, ref }),
      })

    // "other" signs up and confirms first, holds #1 on the time tiebreak
    const other = await (await signupPOST(signupReq('other@example.com', '10.9.9.1'))).json()
    await GET(verifyReq((await getSignupByCode(db, wl.id, other.referralCode))!.verify_token!))

    const referrer = await (await signupPOST(signupReq('referrer@example.com', '10.9.9.2'))).json()
    await GET(verifyReq((await getSignupByCode(db, wl.id, referrer.referralCode))!.verify_token!))

    // idempotent re-signup is the API's status read-back: referrer sits at #2
    const mid = await (await signupPOST(signupReq('referrer@example.com', '10.9.9.3'))).json()
    expect(mid.position).toBe(2)

    // a friend joins via the referrer's link and confirms
    const friend = await (await signupPOST(signupReq('friend@example.com', '10.9.9.4', referrer.referralCode))).json()
    await GET(verifyReq((await getSignupByCode(db, wl.id, friend.referralCode))!.verify_token!))

    const after = await (await signupPOST(signupReq('referrer@example.com', '10.9.9.5'))).json()
    expect(after.position).toBe(1)
  })
})
