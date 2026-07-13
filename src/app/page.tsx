import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/db/client'
import { ensureWaitlist } from '@/lib/db/waitlists'
import { getPoweredByConfig, getRewardTiersConfig, getWaitlistConfig } from '@/lib/config'
import { isValidReferralCode } from '@/lib/referral/code'
import { SignupForm } from './SignupForm'
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

  return (
    <main className={styles.main}>
      {verifyFailed && (
        <p role="alert" className={styles.notice}>
          That confirmation link isn’t valid. Enter your email below to get a fresh one.
        </p>
      )}
      <h1 className={styles.title}>{waitlist.name}</h1>
      <p className={styles.subhead}>Join the waitlist — refer friends to move up the line.</p>
      <SignupForm waitlistSlug={waitlist.slug} referralCode={ref} />
    </main>
  )
}
