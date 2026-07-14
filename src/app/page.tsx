import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/db/client'
import { ensureWaitlist } from '@/lib/db/waitlists'
import { getPoweredByConfig, getRewardTiersConfig, getThemeConfig, getWaitlistConfig } from '@/lib/config'
import { isValidReferralCode } from '@/lib/referral/code'
import { SignupForm } from './SignupForm'
import { accentStyle } from './accent'
import { PoweredBy } from './PoweredBy'
import styles from './page.module.css'

// DB read/provision per request, never prerender at build time.
export const dynamic = 'force-dynamic'

export function generateMetadata(): Metadata {
  const { name } = getWaitlistConfig()
  return { title: name, description: `Join the ${name} waitlist and refer friends to move up the line.` }
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LandingPage({ searchParams }: Props) {
  const params = await searchParams
  const ref = typeof params.ref === 'string' && isValidReferralCode(params.ref) ? params.ref : undefined
  const verifyFailed = params.verify === 'invalid'

  const waitlist = await ensureWaitlist(createServiceClient(), {
    ...getWaitlistConfig(),
    rewardTiers: getRewardTiersConfig(),
    poweredBy: getPoweredByConfig(),
  })
  const theme = getThemeConfig()

  return (
    <main className={`rq-surface ${styles.main}`} style={accentStyle(theme)}>
      <div className={`${styles.sheet} rq-sheet rq-enter`}>
        <div className="rq-frame">
          {/* Hero, copy on the left, the ticket stub on the right */}
          <div className={styles.hero}>
            <div className={styles.copy}>
              {verifyFailed && (
                <p role="alert" className={styles.notice}>
                  That confirmation link isn’t valid. Enter your email below to get a fresh one.
                </p>
              )}
              {theme.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary maker-hosted URL; next/image needs known hosts/dimensions
                <img src={theme.logoUrl} alt={`${waitlist.name} logo`} className={styles.logo} />
              )}
              {theme.headline ? (
                <h1 className={styles.title}>{theme.headline}</h1>
              ) : (
                <h1 className={styles.title}>
                  No. <span className={styles.em}>247</span>
                </h1>
              )}
              <p className={styles.lede}>
                {theme.subhead ?? 'Join the waitlist, then refer friends to move up the line.'}
              </p>
              <div className={styles.boxoffice}>
                <span className={`${styles.cap} rq-caps`}>Present your address at the window</span>
                <SignupForm
                  waitlistSlug={waitlist.slug}
                  referralCode={ref}
                  ctaLabel={theme.ctaLabel ?? 'Claim your seat'}
                />
                <span className={`${styles.fine} rq-caps`}>Admit one · No fee · Keep this stub</span>
              </div>
            </div>

            <div className={styles.ticketwrap}>
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset; plain img keeps the transparent cutout crisp */}
              <img
                className={`${styles.ticket} rq-ticketDrop`}
                src="/ticket-admit-one.webp"
                width={760}
                height={1018}
                fetchPriority="high"
                loading="eager"
                decoding="async"
                alt="A vintage RefQueue Admit One theatre ticket, serial No 00247"
              />
            </div>
          </div>

          <hr className={`${styles.ruleActs} rq-rule`} />

          {/* The three acts */}
          <ol className={styles.acts} aria-label="How it works">
            <li className={styles.act}>
              <span className={styles.actNo}>I.</span>
              <h2 className={styles.actTitle}>Join the line</h2>
              <p className={styles.actText}>
                Leave your address and receive a numbered stub: your place in line, on the spot.
              </p>
            </li>
            <li className={styles.act}>
              <span className={styles.actNo}>II.</span>
              <h2 className={styles.actTitle}>Send your friends</h2>
              <p className={styles.actText}>
                Share your ticket. Every guest who joins through it is one seat closer to the front.
              </p>
            </li>
            <li className={styles.act}>
              <span className={styles.actNo}>III.</span>
              <h2 className={styles.actTitle}>Move up the line</h2>
              <p className={styles.actText}>
                Each confirmed referral advances your number. Watch the stub tick toward No. 1.
              </p>
            </li>
          </ol>

          <hr className={`${styles.ruleFoot} rq-rule rq-rule--thick`} />
          <div className={styles.foot}>
            <PoweredBy enabled={waitlist.powered_by} />
          </div>
        </div>
      </div>
    </main>
  )
}
