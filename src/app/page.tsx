import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/db/client'
import { ensureWaitlist } from '@/lib/db/waitlists'
import { getPoweredByConfig, getRewardTiersConfig, getThemeConfig, getWaitlistConfig } from '@/lib/config'
import { isValidReferralCode } from '@/lib/referral/code'
import { SignupForm } from './SignupForm'
import { accentStyle } from './accent'
import { PoweredBy } from './PoweredBy'
import styles from './page.module.css'

// DB read/provision per request — never prerender at build time.
export const dynamic = 'force-dynamic'

export function generateMetadata(): Metadata {
  const { name } = getWaitlistConfig()
  return { title: name, description: `Join the ${name} waitlist — refer friends to move up the line.` }
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
      <div className={`${styles.hero} rq-enter`}>
        {verifyFailed && (
          <p role="alert" className={styles.notice}>
            That confirmation link isn’t valid. Enter your email below to get a fresh one.
          </p>
        )}
        {theme.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary maker-hosted URL; next/image needs known hosts/dimensions
          <img src={theme.logoUrl} alt={`${waitlist.name} logo`} className={styles.logo} />
        )}
        <span className={styles.kicker}>The waitlist that moves</span>
        <h1 className={styles.title}>{theme.headline ?? waitlist.name}</h1>
        <p className={styles.subhead}>
          {theme.subhead ?? 'Join the waitlist — then refer friends to move up the line.'}
        </p>
        <SignupForm waitlistSlug={waitlist.slug} referralCode={ref} ctaLabel={theme.ctaLabel} />
      </div>

      <section className={`${styles.stepsBand} rq-onDark`} aria-label="How it works">
        <ol className={styles.steps}>
          <li className={styles.step}>
            <span className={styles.stepNum}>01</span>
            <span className={styles.stepTitle}>Join</span>
            <span className={styles.stepText}>Drop your email and claim your spot in line.</span>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNum}>02</span>
            <span className={styles.stepTitle}>Share your link</span>
            <span className={styles.stepText}>Every friend who joins through it is a spot closer to the front.</span>
          </li>
          <li className={styles.step}>
            <span className={styles.stepNum}>03</span>
            <span className={styles.stepTitle}>Move up</span>
            <span className={styles.stepText}>Confirmed referrals climb your number. Watch it drop.</span>
          </li>
        </ol>
      </section>

      <PoweredBy enabled={waitlist.powered_by} />
    </main>
  )
}
