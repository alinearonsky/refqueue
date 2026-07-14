// Seed a RefQueue waitlist with believable, already-verified signups so a fresh
// demo lands a visitor at a real-looking position (e.g. "No. 247") and the maker
// dashboard shows a live 30-day curve, a populated top-referrers list, and a CSV
// worth exporting. Writes straight to Supabase with the service role, so it does
// not need a working email provider or the public API.
//
// Usage:
//   node scripts/seed.mjs                 # 250 signups into the configured waitlist
//   node scripts/seed.mjs --count 120     # a different volume
//   node scripts/seed.mjs --append        # keep existing rows, add on top
//   node scripts/seed.mjs --env .env      # read config from a specific env file
//   npm run seed -- --count 300
//
// Config comes from the same env the app uses (SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, WAITLIST_SLUG, WAITLIST_NAME, REWARD_TIERS). By
// default the script CLEARS the target waitlist's existing signups first so
// reseeding is idempotent; pass --append to skip that.

import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { customAlphabet } from 'nanoid'

// ---- args -----------------------------------------------------------------
const args = process.argv.slice(2)
function flag(name) {
  return args.includes(`--${name}`)
}
function opt(name, fallback) {
  const i = args.indexOf(`--${name}`)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}

const COUNT = Number(opt('count', '250'))
const APPEND = flag('append')
const DRY_RUN = flag('dry-run')
const ENV_FILE = opt('env', null)

if (!Number.isFinite(COUNT) || COUNT < 1) {
  console.error(`--count must be a positive number (got "${opt('count', '250')}")`)
  process.exit(1)
}

// ---- env ------------------------------------------------------------------
// Load an env file if asked (tiny KEY=VALUE parser; no dotenv dependency), then
// fall back to the ambient process env. Explicit process env always wins.
function loadEnvFile(path) {
  const out = {}
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    console.error(`Could not read env file: ${path}`)
    process.exit(1)
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const fileEnv = ENV_FILE ? loadEnvFile(ENV_FILE) : {}
const env = { ...fileEnv, ...process.env }

const SUPABASE_URL = env.SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const SLUG = env.WAITLIST_SLUG ?? 'default'
const NAME = env.WAITLIST_NAME ?? 'Waitlist'

if (!DRY_RUN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error(
    'Missing config. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in the\n' +
      'environment or via --env <file>). These are the same values the app uses.\n' +
      'Or pass --dry-run to preview the generated data without writing anything.',
  )
  process.exit(1)
}

let rewardTiers = []
if (env.REWARD_TIERS) {
  try {
    rewardTiers = JSON.parse(env.REWARD_TIERS)
  } catch {
    console.warn('REWARD_TIERS is not valid JSON; seeding the waitlist with no tiers.')
  }
}

// ---- data generation ------------------------------------------------------
const referralCode = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-', 8)

const FIRST = [
  'ava', 'liam', 'noah', 'mia', 'ethan', 'sofia', 'lucas', 'emma', 'mateo', 'olivia',
  'aiden', 'isla', 'kai', 'nora', 'leo', 'zoe', 'aria', 'jonas', 'priya', 'omar',
  'hana', 'diego', 'ines', 'yuki', 'sara', 'theo', 'lena', 'ravi', 'maya', 'finn',
  'nina', 'arjun', 'clara', 'sam', 'jade', 'nico', 'ada', 'ben', 'rosa', 'ella',
]
const LAST = [
  'kim', 'patel', 'nguyen', 'garcia', 'silva', 'okafor', 'muller', 'rossi', 'haas', 'costa',
  'reyes', 'walsh', 'ito', 'novak', 'khan', 'diaz', 'meyer', 'brandt', 'sole', 'park',
  'fischer', 'moreau', 'osei', 'tanaka', 'lopez', 'weber', 'hansen', 'romano', 'dubois', 'ali',
]
const DOMAINS = ['gmail.com', 'outlook.com', 'proton.me', 'hey.com', 'fastmail.com', 'icloud.com']

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Unique emails: base handle plus a running counter so two "ava.kim"s never collide.
function makeEmail(i) {
  return `${pick(FIRST)}.${pick(LAST)}${i}@${pick(DOMAINS)}`
}

const now = Date.now()
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // spread across the last 30 days

// Weight signups toward the recent end of the window so the dashboard chart looks
// like a waitlist that is picking up steam, not a flat line.
function joinedAt(rankFrac) {
  const eased = Math.pow(rankFrac, 0.7) // more mass near "now"
  const jitter = Math.random() * 0.02
  const ageFrac = Math.min(1, (1 - eased) + jitter)
  return new Date(now - ageFrac * WINDOW_MS)
}

// Build rows oldest-first. Client-side UUIDs let us wire referred_by locally and
// bulk-insert in one shot. Referrers are chosen by preferential attachment (a few
// early joiners accumulate most of the referrals), which yields a believable
// top-referrers leaderboard rather than a uniform one.
const rows = []
const weights = [] // referral "gravity" per row, grows as a row refers others
for (let i = 0; i < COUNT; i++) {
  const createdAt = joinedAt((i + 1) / COUNT)
  // verified a few minutes to a few hours after joining
  const verifiedAt = new Date(createdAt.getTime() + (2 + Math.random() * 180) * 60_000)

  let referredBy = null
  // First ~12% are organic seeds; after a small base exists, ~72% of the rest
  // arrive through a referral link.
  if (i > COUNT * 0.12 && Math.random() < 0.72) {
    const total = weights.reduce((a, b) => a + b, 0)
    let r = Math.random() * total
    for (let j = 0; j < i; j++) {
      r -= weights[j]
      if (r <= 0) {
        // Only credit a referrer who joined earlier (causal chain).
        if (rows[j].verified_at < verifiedAt.toISOString()) {
          referredBy = rows[j].id
          weights[j] += 1 // rich get richer
        }
        break
      }
    }
  }

  rows.push({
    id: randomUUID(),
    waitlist_id: null, // filled after we resolve the waitlist
    email: makeEmail(i),
    verified: true,
    verify_token: referralCode() + referralCode(), // opaque; never emailed for seeds
    referral_code: referralCode(),
    referred_by: referredBy,
    created_at: createdAt.toISOString(),
    verified_at: verifiedAt.toISOString(),
  })
  weights.push(1) // everyone starts with a little gravity so late joiners can still refer
}

// Referral tally, reused for the run summary (and the dry-run preview).
function summarize() {
  const counts = new Map()
  for (const r of rows) {
    if (r.referred_by) counts.set(r.referred_by, (counts.get(r.referred_by) ?? 0) + 1)
  }
  const referred = rows.filter(r => r.referred_by).length
  const top = [...counts.values()].sort((a, b) => b - a)
  const future = rows.filter(r => {
    if (!r.referred_by) return false
    const ref = rows.find(x => x.id === r.referred_by)
    return ref && ref.verified_at >= r.verified_at // referrer must be earlier
  }).length
  return { referred, topReferrer: top[0] ?? 0, referrers: counts.size, top5: top.slice(0, 5), future }
}

// ---- dry run --------------------------------------------------------------
if (DRY_RUN) {
  const s = summarize()
  const oldest = rows[0].created_at.slice(0, 10)
  const newest = rows[rows.length - 1].created_at.slice(0, 10)
  console.log(
    `Dry run: generated ${rows.length} signups (nothing written).\n` +
      `  Join dates span ${oldest} -> ${newest}.\n` +
      `  ${s.referred} arrived via referral across ${s.referrers} referrers.\n` +
      `  Top 5 referrer tallies: ${s.top5.join(', ') || '(none)'}.\n` +
      `  Causality violations (referrer not earlier): ${s.future} (should be 0).\n` +
      `  Sample email: ${rows[0].email}`,
  )
  process.exit(0)
}

// ---- write ----------------------------------------------------------------
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

async function main() {
  // Resolve (or create) the waitlist row the app serves.
  let { data: waitlist, error: findErr } = await db
    .from('waitlists')
    .select('id, name, slug')
    .eq('slug', SLUG)
    .maybeSingle()
  if (findErr) throw findErr

  if (!waitlist) {
    const { data: created, error: createErr } = await db
      .from('waitlists')
      .insert({ name: NAME, slug: SLUG, reward_tiers: rewardTiers })
      .select('id, name, slug')
      .single()
    if (createErr) throw createErr
    waitlist = created
    console.log(`Created waitlist "${waitlist.name}" (slug: ${waitlist.slug}).`)
  } else {
    console.log(`Using waitlist "${waitlist.name}" (slug: ${waitlist.slug}).`)
  }

  if (!APPEND) {
    const { count, error: countErr } = await db
      .from('signups')
      .select('id', { count: 'exact', head: true })
      .eq('waitlist_id', waitlist.id)
    if (countErr) throw countErr
    if (count && count > 0) {
      const { error: delErr } = await db.from('signups').delete().eq('waitlist_id', waitlist.id)
      if (delErr) throw delErr
      console.log(`Cleared ${count} existing signup(s) (pass --append to keep them).`)
    }
  }

  for (const row of rows) row.waitlist_id = waitlist.id

  // Insert in batches; referred_by references earlier rows, so insert oldest-first
  // in order to satisfy the self-referencing FK.
  const BATCH = 200
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error } = await db.from('signups').insert(chunk)
    if (error) throw error
    inserted += chunk.length
    process.stdout.write(`\rInserted ${inserted}/${rows.length}...`)
  }
  process.stdout.write('\n')

  const s = summarize()
  console.log(
    `\nSeeded ${rows.length} verified signups into "${waitlist.name}".\n` +
      `  ${s.referred} arrived through a referral link; top referrer has ${s.topReferrer} confirmed.\n` +
      `A newly confirmed visitor will land near No. ${rows.length + 1}.\n` +
      `Open the landing page, sign up, confirm, and check the dashboard to verify.`,
  )
}

main().catch(err => {
  console.error('\nSeed failed:', err.message ?? err)
  process.exit(1)
})
