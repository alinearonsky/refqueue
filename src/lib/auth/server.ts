import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getSupabaseAnonKey } from '@/lib/config'

/**
 * Anon-key client bound to the request's cookies — Supabase Auth sessions ONLY.
 * All table access stays on createServiceClient (RLS deny-all blocks this client
 * from data by design). Server components can't write cookies, hence the
 * try/catch in setAll; middleware (src/middleware.ts) owns token refresh.
 */
export async function createAuthClient(): Promise<SupabaseClient> {
  const url = process.env.SUPABASE_URL
  if (!url) throw new Error('SUPABASE_URL must be set')
  const cookieStore = await cookies()
  return createServerClient(url, getSupabaseAnonKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a server component — cookie writes are forbidden there.
        }
      },
    },
  })
}

/** The signed-in maker, or null. Uses getUser() (validates against the auth server). */
export async function getMakerUser(): Promise<User | null> {
  const supabase = await createAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
