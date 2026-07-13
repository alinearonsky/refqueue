import { test, expect, describe, beforeEach } from 'vitest'
import { createServiceClient } from '@/lib/db/client'
import { ensureWaitlist } from './waitlists'

const db = createServiceClient()
async function reset() {
  await db.from('signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await db.from('waitlists').delete().neq('id', '00000000-0000-0000-0000-000000000000')
}

describe('ensureWaitlist (integration)', () => {
  beforeEach(reset)

  test('creates the waitlist when missing, with defaults', async () => {
    const wl = await ensureWaitlist(db, { slug: 'ew1', name: 'Ensure One' })
    expect(wl.slug).toBe('ew1')
    expect(wl.name).toBe('Ensure One')
    expect(wl.reward_tiers).toEqual([])
    expect(wl.powered_by).toBe(true)
  })

  test('is idempotent and syncs the name from env on later calls', async () => {
    const first = await ensureWaitlist(db, { slug: 'ew2', name: 'Old Name' })
    const renamed = await ensureWaitlist(db, { slug: 'ew2', name: 'New Name' })
    expect(renamed.id).toBe(first.id)
    expect(renamed.name).toBe('New Name')
    const { count } = await db.from('waitlists').select('id', { count: 'exact', head: true }).eq('slug', 'ew2')
    expect(count).toBe(1)
  })
})
