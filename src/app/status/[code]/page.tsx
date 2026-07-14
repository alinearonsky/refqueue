import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/db/client'
import { getWaitlistBySlug } from '@/lib/db/waitlists'
import { getSignupByCode } from '@/lib/db/signups'
import { getSignupStatus } from '@/lib/status/status'
import { getThemeConfig, getWaitlistConfig } from '@/lib/config'
import { isValidReferralCode } from '@/lib/referral/code'
import { buildShareLinks } from '@/lib/referral/share'
import { accentStyle } from '../../accent'
import { PoweredBy } from '../../PoweredBy'
import { CopyButton } from './CopyButton'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export function generateMetadata(): Metadata {
  return {
    title: `Your spot · ${getWaitlistConfig().name}`,
    robots: { index: false }, // per-signup pages don't belong in search indexes
  }
}

interface Props {
  params: Promise<{ code: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function Letterhead({ name }: { name: string }) {
  return (
    <div className={`${styles.head} rq-caps`}>
      <span className={styles.headMid}>★ The {name} Variety Co. ★</span>
    </div>
  )
}

export default async function StatusPage({ params, searchParams }: Props) {
  const { code } = await params
  if (!isValidReferralCode(code)) notFound()

  const db = createServiceClient()
  const waitlist = await getWaitlistBySlug(db, getWaitlistConfig().slug)
  if (!waitlist) notFound()
  const signup = await getSignupByCode(db, waitlist.id, code)
  if (!signup) notFound()

  const theme = getThemeConfig()

  // Anyone holding the referral link can open this page, render no email address.
  if (!signup.verified) {
    return (
      <main className={`rq-surface ${styles.main}`} style={accentStyle(theme)}>
        <div className={`${styles.sheet} rq-sheet rq-enter`}>
          <div className="rq-frame">
            <Letterhead name={waitlist.name} />
            <hr className={`${styles.ruleTop} rq-rule rq-rule--thick`} />
            <div className={styles.pending}>
              <span className={`${styles.overline} rq-caps`}>One step left</span>
              <h1 className={styles.pendingTitle}>Almost there</h1>
              <p className={styles.pendingText}>
                Check your inbox and click the confirmation link to lock in your spot on {waitlist.name}.
              </p>
            </div>
            <hr className={`${styles.ruleFoot} rq-rule rq-rule--thick`} />
            <div className={styles.foot}>
              <PoweredBy enabled={waitlist.powered_by} />
            </div>
          </div>
        </div>
      </main>
    )
  }

  const status = await getSignupStatus(db, waitlist, signup)
  const share = buildShareLinks(status.referralLink, waitlist.name)
  const welcome = (await searchParams).welcome === '1'
  const { unlocked, next, toNext } = status.rewards

  return (
    <main className={`rq-surface ${styles.main}`} style={accentStyle(theme)}>
      <div className={`${styles.sheet} rq-sheet rq-enter`}>
        <div className="rq-frame">
          <Letterhead name={waitlist.name} />
          <hr className={`${styles.ruleTop} rq-rule rq-rule--thick`} />

          <h1 className="rq-srOnly">
            Your position on {waitlist.name}: No. {status.position}
          </h1>

          {welcome && (
            <p className={`${styles.welcome} rq-bannerStamp`}>You’re in. Your spot is confirmed.</p>
          )}

          {/* THE stub, the live position printed as a ticket serial */}
          <div className={styles.ticket}>
            <span className={`${styles.overline} rq-caps`}>Your position on {waitlist.name}</span>
            <div className={`${styles.admit} rq-caps`}>
              <span className={styles.admitRule} aria-hidden="true" />
              Admit one · in line
              <span className={styles.admitRule} aria-hidden="true" />
            </div>
            <p className={`${styles.serial} rq-stamp`}>
              <span className={styles.serialNo}>No.</span>
              {status.position}
            </p>
            <p className={styles.referrals}>
              {status.confirmedReferrals === 1
                ? '1 friend has joined through your link'
                : `${status.confirmedReferrals} friends have joined through your link`}
            </p>
          </div>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Move up the line</h2>
            <p className={styles.cardText}>
              Every friend who joins through your link and confirms their email moves you up.
            </p>
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
              <h2 className={styles.cardTitle}>Rewards</h2>
              <ul className={styles.tiers}>
                {unlocked.map(t => (
                  <li key={`${t.referrals}-${t.label}`} className={styles.unlocked}>
                    <svg
                      className={styles.check}
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M13.5 4.5L6.5 11.5L2.5 7.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{t.label}</span>
                  </li>
                ))}
                {next && (
                  <li className={styles.nextTier}>
                    Refer {toNext} more to unlock <strong>{next.label}</strong>
                  </li>
                )}
              </ul>
            </section>
          )}

          <hr className={`${styles.ruleFoot} rq-rule rq-rule--thick`} />
          <div className={styles.foot}>
            <PoweredBy enabled={waitlist.powered_by} />
          </div>
        </div>
      </div>
    </main>
  )
}
