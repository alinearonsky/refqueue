import { test, expect, describe, beforeEach } from 'vitest'
import { POST } from './route'
import { createServiceClient } from '@/lib/db/client'
import { createWaitlistForTest } from '@/lib/db/signups'

const db = createServiceClient()
async function reset() {
  await db.from('signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('waitlists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

function req(body: unknown, ip = '10.0.0.1') {
  return new Request('http://localhost/api/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

describe('POST /api/signup (integration)', () => {
  beforeEach(reset)

  test('valid signup returns 200 with a referral code and position', async () => {
    const wl = await createWaitlistForTest(db, 'launch')
    const res = await POST(req({ waitlistSlug: 'launch', email: 'a@example.com' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.referralCode).toMatch(/^[0-9A-Za-z_-]{8}$/)
    expect(typeof json.position).toBe('number')
  })

  test('malformed email returns 400', async () => {
    const wl = await createWaitlistForTest(db, 'launch2')
    const res = await POST(req({ waitlistSlug: 'launch2', email: 'nope' }))
    expect(res.status).toBe(400)
  })

  test('disposable email returns 422', async () => {
    const wl = await createWaitlistForTest(db, 'launch3')
    const res = await POST(req({ waitlistSlug: 'launch3', email: 'x@mailinator.com' }))
    expect(res.status).toBe(422)
  })

  test('unknown waitlist slug returns 404', async () => {
    const res = await POST(req({ waitlistSlug: 'ghost', email: 'a@example.com' }))
    expect(res.status).toBe(404)
  })
})
