import type { SupabaseClient } from '@supabase/supabase-js'

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
    return
  }

  const { error: updateError } = await db.auth.admin.updateUserById(existing.id, {
    password: creds.password,
  })
  if (updateError) throw updateError
}
