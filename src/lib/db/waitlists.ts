import type { SupabaseClient } from '@supabase/supabase-js'

export interface WaitlistRecord {
  id: string
  name: string
  slug: string
  theme: Record<string, unknown>
  reward_tiers: { referrals: number; label: string }[]
  powered_by: boolean
}

export async function getWaitlistBySlug(db: SupabaseClient, slug: string): Promise<WaitlistRecord | null> {
  const { data, error } = await db.from('waitlists').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return (data as WaitlistRecord) ?? null
}

export async function getWaitlistById(db: SupabaseClient, id: string): Promise<WaitlistRecord | null> {
  const { data, error } = await db.from('waitlists').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as WaitlistRecord) ?? null
}
