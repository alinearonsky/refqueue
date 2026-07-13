import type { SupabaseClient } from '@supabase/supabase-js'
import type { RewardTier } from '@/lib/referral/position'

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

export interface WaitlistProvisionInput {
  slug: string
  name: string
  rewardTiers: RewardTier[]
  poweredBy: boolean
}

/**
 * Idempotent provisioning of the instance's single waitlist from env config
 * (env is v1's only config surface — no settings UI). Called on landing-page
 * render: creates the row on first deploy, then diff-syncs name, reward tiers,
 * and the powered-by flag whenever the maker changes env. Unchanged config
 * costs zero writes. `theme` stays untouched (presentation-only, read from env).
 */
export async function ensureWaitlist(db: SupabaseClient, input: WaitlistProvisionInput): Promise<WaitlistRecord> {
  const existing = await getWaitlistBySlug(db, input.slug)
  if (existing) {
    const patch: Record<string, unknown> = {}
    if (existing.name !== input.name) patch.name = input.name
    if (JSON.stringify(existing.reward_tiers) !== JSON.stringify(input.rewardTiers)) {
      patch.reward_tiers = input.rewardTiers
    }
    if (existing.powered_by !== input.poweredBy) patch.powered_by = input.poweredBy
    if (Object.keys(patch).length === 0) return existing

    const { data, error } = await db.from('waitlists').update(patch).eq('id', existing.id).select().single()
    if (error) throw error
    return data as WaitlistRecord
  }

  const { data, error } = await db
    .from('waitlists')
    .insert({
      slug: input.slug,
      name: input.name,
      reward_tiers: input.rewardTiers,
      powered_by: input.poweredBy,
    })
    .select()
    .single()
  if (error) {
    // 23505 = unique_violation: created concurrently — fetch and return it.
    if (error.code === '23505') {
      const raced = await getWaitlistBySlug(db, input.slug)
      if (raced) return raced
    }
    throw error
  }
  return data as WaitlistRecord
}
