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
    <main className={styles.main} style={accentStyle(theme)}>
      {verifyFailed && (
        <p role="alert" className={styles.notice}>
          That confirmation link isn’t valid. Enter your email below to get a fresh one.
        </p>
      )}
      {theme.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary maker-hosted URL; next/image needs known hosts/dimensions
        <img src={theme.logoUrl} alt={`${waitlist.name} logo`} className={styles.logo} />
      )}
      <h1 className={styles.title}>{theme.headline ?? waitlist.name}</h1>
      <p className={styles.subhead}>{theme.subhead ?? 'Join the waitlist — refer friends to move up the line.'}</p>
      <SignupForm waitlistSlug={waitlist.slug} referralCode={ref} ctaLabel={theme.ctaLabel} />
      <PoweredBy enabled={waitlist.powered_by} />
    </main>
  )
}
