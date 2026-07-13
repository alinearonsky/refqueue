import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/db/client'
import { getWaitlistBySlug } from '@/lib/db/waitlists'
import { getSignupByCode } from '@/lib/db/signups'
import { getSignupStatus } from '@/lib/status/status'
import { getWaitlistConfig } from '@/lib/config'
import { isValidReferralCode } from '@/lib/referral/code'
import { buildShareLinks } from '@/lib/referral/share'
import { CopyButton } from './CopyButton'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export function generateMetadata(): Metadata {
  return {
    title: `Your spot — ${getWaitlistConfig().name}`,
    robots: { index: false }, // per-signup pages don't belong in search indexes
  }
}

interface Props {
  params: Promise<{ code: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function StatusPage({ params, searchParams }: Props) {
  const { code } = await params
  if (!isValidReferralCode(code)) notFound()

  const db = createServiceClient()
  const waitlist = await getWaitlistBySlug(db, getWaitlistConfig().slug)
  if (!waitlist) notFound()
  const signup = await getSignupByCode(db, waitlist.id, code)
  if (!signup) notFound()

  // Anyone holding the referral link can open this page — render no email address.
  if (!signup.verified) {
    return (
      <main className={styles.main}>
        <h1 className={styles.pendingTitle}>Almost there</h1>
        <p className={styles.pendingText}>
          Check your inbox and click the confirmation link to lock in your spot on {waitlist.name}.
        </p>
      </main>
    )
  }

  const status = await getSignupStatus(db, waitlist, signup)
  const share = buildShareLinks(status.referralLink, waitlist.name)
  const welcome = (await searchParams).welcome === '1'
  const { unlocked, next, toNext } = status.rewards

  return (
    <main className={styles.main}>
      {welcome && <p className={styles.welcome}>You’re in — your spot is confirmed.</p>}

      <p className={styles.positionLabel}>Your position on {waitlist.name}</p>
      <p className={styles.position}>#{status.position}</p>
      <p className={styles.referrals}>
        {status.confirmedReferrals === 1
          ? '1 friend has joined through your link'
          : `${status.confirmedReferrals} friends have joined through your link`}
      </p>

      <section className={styles.card}>
        <h2>Move up the line</h2>
        <p>Every friend who joins through your link and confirms their email moves you up.</p>
        <div className={styles.linkRow}>
          <code className={styles.link}>{status.referralLink}</code>
          <CopyButton text={status.referralLink} />
        </div>
        <div className={styles.shareRow}>
          <a href={share.x} target="_blank" rel="noopener noreferrer">Share on X</a>
          <a href={share.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a href={share.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href={share.email}>Email</a>
        </div>
      </section>

      {(unlocked.length > 0 || next) && (
        <section className={styles.card}>
          <h2>Rewards</h2>
          <ul className={styles.tiers}>
            {unlocked.map(t => (
              <li key={`${t.referrals}-${t.label}`} className={styles.unlocked}>
                ✓ {t.label}
              </li>
            ))}
            {next && (
              <li>
                Refer {toNext} more to unlock <strong>{next.label}</strong>
              </li>
            )}
          </ul>
        </section>
      )}
    </main>
  )
}
