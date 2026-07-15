import type { Metadata } from 'next'
import { getDemoSiteEnabled, getWaitlistConfig } from '@/lib/config'
import { isValidReferralCode } from '@/lib/referral/code'
import { WaitlistLanding } from './WaitlistLanding'
import { PitchLanding } from './PitchLanding'

// DB read/provision per request, never prerender at build time.
export const dynamic = 'force-dynamic'

export function generateMetadata(): Metadata {
  if (getDemoSiteEnabled()) {
    return {
      title: 'Refqueue: open-source waitlist with referrals',
      description:
        'A free, self-hosted waitlist with built-in referrals. An open-source, free alternative to GetWaitlist or Viral Loops.',
    }
  }
  const { name } = getWaitlistConfig()
  return { title: name, description: `Join the ${name} waitlist and refer friends to move up the line.` }
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function RootPage({ searchParams }: Props) {
  // refqueue.com: root is the product pitch, the live waitlist lives at /demo.
  // Self-hosted (flag off): root is the maker's own waitlist, exactly as before.
  if (getDemoSiteEnabled()) return <PitchLanding />

  const params = await searchParams
  const ref = typeof params.ref === 'string' && isValidReferralCode(params.ref) ? params.ref : undefined
  const verifyFailed = params.verify === 'invalid'
  return <WaitlistLanding referralCode={ref} verifyFailed={verifyFailed} />
}
