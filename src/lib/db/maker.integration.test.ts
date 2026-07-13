import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServiceClient } from './client'
import { ensureMakerAccount } from './maker'

const db = createServiceClient()
const TEST_EMAIL = `maker-test-${Date.now()}@example.com`

async function findTestUser() {
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return data.users.find((u) => u.email === TEST_EMAIL) ?? null
}

async function deleteTestUser() {
  const user = await findTestUser()
  if (user) await db.auth.admin.deleteUser(user.id)
}

beforeAll(deleteTestUser)
afterAll(deleteTestUser)

describe('ensureMakerAccount', () => {
  it('creates the account on first run, is a no-op on re-run', async () => {
    await ensureMakerAccount(db, { email: TEST_EMAIL, password: 'first-password-123' })
    const created = await findTestUser()
    expect(created).not.toBeNull()

    await ensureMakerAccount(db, { email: TEST_EMAIL, password: 'first-password-123' })
    const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) throw error
    expect(data.users.filter((u) => u.email === TEST_EMAIL)).toHaveLength(1)
  })

  it('provisions an account the maker can actually sign in with, and syncs password changes from env', async () => {
    await ensureMakerAccount(db, { email: TEST_EMAIL, password: 'second-password-456' })

    const anon = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    })

    const stale = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: 'first-password-123' })
    expect(stale.error).not.toBeNull()

    const fresh = await anon.auth.signInWithPassword({ email: TEST_EMAIL, password: 'second-password-456' })
    expect(fresh.error).toBeNull()
    expect(fresh.data.user?.email).toBe(TEST_EMAIL)
  })
})
