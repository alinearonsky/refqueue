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
    const wl = await ensureWaitlist(db, { slug: 'ew1', name: 'Ensure One', rewardTiers: [], poweredBy: true })
    expect(wl.slug).toBe('ew1')
    expect(wl.name).toBe('Ensure One')
    expect(wl.reward_tiers).toEqual([])
    expect(wl.powered_by).toBe(true)
  })

  test('is idempotent and syncs the name from env on later calls', async () => {
    const first = await ensureWaitlist(db, { slug: 'ew2', name: 'Old Name', rewardTiers: [], poweredBy: true })
    const renamed = await ensureWaitlist(db, { slug: 'ew2', name: 'New Name', rewardTiers: [], poweredBy: true })
    expect(renamed.id).toBe(first.id)
    expect(renamed.name).toBe('New Name')
    const { count } = await db.from('waitlists').select('id', { count: 'exact', head: true }).eq('slug', 'ew2')
    expect(count).toBe(1)
  })

  test('ensureWaitlist syncs reward tiers and powered_by from env config', async () => {
    const tiers = [
      { referrals: 3, label: 'Early access' },
      { referrals: 10, label: 'Founding member' },
    ]
    const created = await ensureWaitlist(db, { slug: 'w-sync', name: 'Sync', rewardTiers: tiers, poweredBy: true })
    expect(created.reward_tiers).toEqual(tiers)
    expect(created.powered_by).toBe(true)

    // Change tiers + flag -> row updates.
    const changed = await ensureWaitlist(db, {
      slug: 'w-sync',
      name: 'Sync',
      rewardTiers: [{ referrals: 5, label: 'Beta invite' }],
      poweredBy: false,
    })
    expect(changed.id).toBe(created.id)
    expect(changed.reward_tiers).toEqual([{ referrals: 5, label: 'Beta invite' }])
    expect(changed.powered_by).toBe(false)

    // Unchanged config -> returned as-is (no-op path).
    const same = await ensureWaitlist(db, {
      slug: 'w-sync',
      name: 'Sync',
      rewardTiers: [{ referrals: 5, label: 'Beta invite' }],
      poweredBy: false,
    })
    expect(same).toEqual(changed)
  })

  test('unchanged config issues zero writes even with non-empty tiers (jsonb reorders object keys)', async () => {
    const tiers = [{ referrals: 5, label: 'Beta invite' }]
    await ensureWaitlist(db, { slug: 'w-noop', name: 'Noop', rewardTiers: tiers, poweredBy: true })

    // Spy on the query builder: flag any access to .update on the second, identical call.
    let updateCalled = false
    const spyDb = new Proxy(db, {
      get(target, prop) {
        if (prop === 'from') {
          return (table: string) =>
            new Proxy(target.from(table), {
              get(builder, builderProp) {
                if (builderProp === 'update') updateCalled = true
                const value = Reflect.get(builder, builderProp)
                return typeof value === 'function' ? value.bind(builder) : value
              },
            })
        }
        const value = Reflect.get(target, prop)
        return typeof value === 'function' ? value.bind(target) : value
      },
    }) as typeof db

    const same = await ensureWaitlist(spyDb, { slug: 'w-noop', name: 'Noop', rewardTiers: tiers, poweredBy: true })
    expect(updateCalled).toBe(false)
    expect(same.reward_tiers).toEqual(tiers)
  })
})
