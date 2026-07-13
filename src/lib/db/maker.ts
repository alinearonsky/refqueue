import type { SupabaseClient } from '@supabase/supabase-js'

// Last successfully synced `email:password` pair. ensureMakerAccount runs on
// every anonymous /login render, and we can't compare against GoTrue's stored
// hash — so without this memo every request would force a bcrypt rehash via
// updateUserById. A changed MAKER_PASSWORD in env misses the memo and still
// triggers a full sync, keeping env as the source of truth.
let lastSyncedCreds: string | null = null

/**
 * Idempotent provisioning of the single maker account from env credentials
 * (mirrors ensureWaitlist). Called on /login render. The password is synced
 * on every call so env stays the source of truth — password recovery for a
 * self-hoster = change MAKER_PASSWORD and reload /login.
 */
export async function ensureMakerAccount(
  db: SupabaseClient,
  creds: { email: string; password: string },
): Promise<void> {
  const email = creds.email.trim().toLowerCase()

  const memoKey = `${email}:${creds.password}`
  if (lastSyncedCreds === memoKey) return

  // Only page 1 is read — fine for a single-maker instance, but this silently
  // stops finding the account if the project ever exceeds 1000 auth users.
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  const existing = data.users.find((u) => u.email?.toLowerCase() === email)

  if (!existing) {
    const { error: createError } = await db.auth.admin.createUser({
      email,
      password: creds.password,
      email_confirm: true,
    })
    // email_exists = created concurrently; password syncs on the next render.
    if (createError && createError.code !== 'email_exists') throw createError
    if (!createError) lastSyncedCreds = memoKey
    return
  }

  const { error: updateError } = await db.auth.admin.updateUserById(existing.id, {
    password: creds.password,
  })
  if (updateError) throw updateError
  lastSyncedCreds = memoKey
}
