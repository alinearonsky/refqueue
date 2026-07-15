import type { Metadata } from 'next'
import { isValidReferralCode } from '@/lib/referral/code'
import { WaitlistLanding } from '../WaitlistLanding'
import { DemoBar } from '../DemoBar'

// DB read/provision per request, never prerender at build time.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Refqueue: live demo',
  description: 'A live, interactive demo of a Refqueue waitlist. Sign up and watch the referral mechanic work.',
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DemoPage({ searchParams }: Props) {
  const params = await searchParams
  const ref = typeof params.ref === 'string' && isValidReferralCode(params.ref) ? params.ref : undefined
  const verifyFailed = params.verify === 'invalid'
  return (
    <>
      <DemoBar />
      <WaitlistLanding referralCode={ref} verifyFailed={verifyFailed} />
    </>
  )
}
