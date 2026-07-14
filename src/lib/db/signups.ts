import type { SupabaseClient } from '@supabase/supabase-js'
import { generateReferralCode } from '@/lib/referral/code'
import { randomToken } from '@/lib/referral/token'

export interface SignupRecord {
  id: string
  waitlist_id: string
  email: string
  verified: boolean
  verify_token: string | null
  referral_code: string
  referred_by: string | null
  created_at: string
  verified_at: string | null
}

export async function createWaitlistForTest(
  db: SupabaseClient,
  slug: string,
  rewardTiers: { referrals: number; label: string }[] = [],
) {
  const { data, error } = await db
    .from('waitlists')
    .insert({ name: slug, slug, reward_tiers: rewardTiers })
    .select()
    .single()
  if (error) throw error
  return data as { id: string; slug: string }
}

export async function getSignupByCode(db: SupabaseClient, waitlistId: string, code: string) {
  const { data, error } = await db
    .from('signups')
    .select('*')
    .eq('waitlist_id', waitlistId)
    .eq('referral_code', code)
    .maybeSingle()
  if (error) throw error
  return (data as SignupRecord) ?? null
}

export async function getSignupById(db: SupabaseClient, id: string): Promise<SignupRecord | null> {
  const { data, error } = await db.from('signups').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as SignupRecord) ?? null
}

async function findReferrerId(db: SupabaseClient, waitlistId: string, referrerCode?: string): Promise<string | null> {
  if (!referrerCode) return null
  const { data, error } = await db
    .from('signups')
    .select('id')
    .eq('waitlist_id', waitlistId)
    .eq('referral_code', referrerCode)
    .maybeSingle()
  if (error) throw error
  return data ? (data as { id: string }).id : null
}

export async function createSignup(
  db: SupabaseClient,
  input: { waitlistId: string; email: string; referrerCode?: string },
): Promise<SignupRecord> {
  const email = input.email.trim().toLowerCase()

  // Idempotent: return the existing row if this email already signed up on this waitlist.
  const { data: existing, error: existingError } = await db
    .from('signups')
    .select('*')
    .eq('waitlist_id', input.waitlistId)
    .eq('email', email)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) return existing as SignupRecord

  const referredBy = await findReferrerId(db, input.waitlistId, input.referrerCode)

  // Retry on the (rare) referral_code unique collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await db
      .from('signups')
      .insert({
        waitlist_id: input.waitlistId,
        email,
        referral_code: generateReferralCode(),
        verify_token: randomToken(),
        referred_by: referredBy,
      })
      .select()
      .single()
    if (!error) return data as SignupRecord
    // 23505 = unique_violation. If it's the email (race), fetch & return; if code, retry.
    if (error.code === '23505') {
      const { data: raced, error: racedError } = await db
        .from('signups')
        .select('*')
        .eq('waitlist_id', input.waitlistId)
        .eq('email', email)
        .maybeSingle()
      if (racedError) throw racedError
      if (raced) return raced as SignupRecord
      continue // code collision, regenerate and retry
    }
    throw error
  }
  throw new Error('createSignup: exhausted referral_code attempts')
}

export interface VerifyResult {
  signup: SignupRecord
  alreadyVerified: boolean
}

/**
 * Idempotent: the token is KEPT after verification so email-scanner prefetch
 * (e.g. Outlook Safe Links) consuming the link first doesn't lock the real user
 * out, prefetch and real click both land on the same status redirect. A scanner
 * hit still proves the inbox is real (the token only travels through that inbox),
 * so double-opt-in's anti-gaming property holds. `alreadyVerified` tells the
 * caller whether THIS call did the verifying, milestone emails fire only then.
 */
export async function verifySignup(db: SupabaseClient, token: string): Promise<VerifyResult | null> {
  const { data, error } = await db.from('signups').select('*').eq('verify_token', token).maybeSingle()
  if (error) throw error
  if (!data) return null
  const existing = data as SignupRecord
  if (existing.verified) return { signup: existing, alreadyVerified: true }

  const { data: updated, error: updateError } = await db
    .from('signups')
    .update({ verified: true, verified_at: new Date().toISOString() })
    .eq('id', existing.id)
    .eq('verified', false) // concurrent prefetch + click: exactly one caller wins this update
    .select()
    .maybeSingle()
  if (updateError) throw updateError
  if (updated) return { signup: updated as SignupRecord, alreadyVerified: false }

  // Lost the race, the row verified between our read and update. Report as already-verified.
  const raced = await getSignupById(db, existing.id)
  return raced ? { signup: raced, alreadyVerified: true } : null
}

export async function countConfirmedReferrals(db: SupabaseClient, signupId: string): Promise<number> {
  const { count, error } = await db
    .from('signups')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', signupId)
    .eq('verified', true)
  if (error) throw error
  return count ?? 0
}

export interface VerifiedSignupRow {
  id: string
  verified_at: string | null
  referred_by: string | null
}

/** Verified signups on a waitlist, in the shape the position engine + tally need. */
export async function listVerifiedSignups(db: SupabaseClient, waitlistId: string): Promise<VerifiedSignupRow[]> {
  const { data, error } = await db
    .from('signups')
    .select('id, verified_at, referred_by')
    .eq('waitlist_id', waitlistId)
    .eq('verified', true)
  if (error) throw error
  return (data ?? []) as VerifiedSignupRow[]
}

/**
 * Every signup for the waitlist, oldest first, the dashboard's single query.
 * All metrics (positions, referral counts, top referrers, day buckets, CSV)
 * derive from this one result in pure code; never add per-row queries here.
 */
export async function listAllSignups(db: SupabaseClient, waitlistId: string): Promise<SignupRecord[]> {
  const { data, error } = await db
    .from('signups')
    .select('*')
    .eq('waitlist_id', waitlistId)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
  if (error) throw error
  return (data ?? []) as SignupRecord[]
}
