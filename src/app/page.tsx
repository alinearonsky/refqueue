import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/db/client'
import { ensureWaitlist } from '@/lib/db/waitlists'
import { getPoweredByConfig, getRewardTiersConfig, getThemeConfig, getWaitlistConfig } from '@/lib/config'
import { isValidReferralCode } from '@/lib/referral/code'
import { SignupForm } from './SignupForm'
import { accentStyle } from './accent'
import styles from './page.module.css'

const REPO_URL = 'https://github.com/alinearonsky/refqueue'

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
        <div className={`rq-frame ${styles.frame}`}>
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
                <h1 className={`${styles.title} ${styles.num} rq-num rq-fade`}>{theme.headline}</h1>
              ) : (
                <>
                  <div className={styles.noline}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
                    <img className={styles.no} src="/playbill/no.png" alt="No." />
                    {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
                    <img className={styles.hand} src="/playbill/hand.png" alt="" aria-hidden="true" />
                  </div>
                  <h1 className={`${styles.num} rq-num rq-fade`}>247</h1>
                </>
              )}
              <p className={styles.sub}>
                {theme.subhead ?? 'Join the waitlist, then refer friends to move up the line.'}
              </p>

              <div className={styles.present}>
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
                <img className={`${styles.flr} ${styles.flrL}`} src="/playbill/star.png" alt="" aria-hidden="true" />
                <span className={`${styles.presentLab} rq-caps rq-tfade`}>Present your address at the window</span>
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
                <img className={styles.flr} src="/playbill/star.png" alt="" aria-hidden="true" />
              </div>

              <SignupForm
                waitlistSlug={waitlist.slug}
                referralCode={ref}
                ctaLabel={theme.ctaLabel ?? 'Claim your seat'}
              />

              <div className={styles.fine}>
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
                <img className={styles.fineHand} src="/playbill/hand.png" alt="" aria-hidden="true" />
                <span className="rq-tfade">Admit one · No fee · Keep this stub</span>
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
                <img className={`${styles.fineHand} ${styles.flrL}`} src="/playbill/hand.png" alt="" aria-hidden="true" />
              </div>
            </div>

            <div className={styles.ticketwrap}>
              {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset; plain img keeps the transparent cutout crisp */}
              <img
                className={`${styles.ticket} rq-ticketDrop`}
                src="/playbill/ticket.png"
                width={734}
                height={1449}
                fetchPriority="high"
                loading="eager"
                decoding="async"
                alt="A vintage RefQueue Admit One theatre ticket, serial No 00247"
              />
            </div>
          </div>

          {/* thin flourish separator */}
          <div className={styles.sep} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
            <img className={`${styles.sepFlr} ${styles.sepL}`} src="/playbill/star.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
            <img className={`${styles.sepFlr} ${styles.sepR}`} src="/playbill/star.png" alt="" />
          </div>

          {/* The three acts */}
          <ol className={styles.acts} aria-label="How it works">
            <li className={styles.act}>
              <div className={styles.actTop}>
                <span className={styles.actNo}>I.</span>
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
                <img className={styles.actHand} src="/playbill/hand.png" alt="" aria-hidden="true" />
              </div>
              <h2 className={`${styles.actTitle} rq-caps rq-tfade`}>Join the line</h2>
              <p className={styles.actText}>
                Leave your address and receive a numbered stub: your place in line, on the spot.
              </p>
            </li>
            <li className={styles.act}>
              <div className={styles.actTop}>
                <span className={styles.actNo}>II.</span>
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
                <img className={styles.actHand} src="/playbill/hand.png" alt="" aria-hidden="true" />
              </div>
              <h2 className={`${styles.actTitle} rq-caps rq-tfade`}>Send your friends</h2>
              <p className={styles.actText}>
                Share your ticket. Every guest who joins through it is one seat closer to the front.
              </p>
            </li>
            <li className={styles.act}>
              <div className={styles.actTop}>
                <span className={styles.actNo}>III.</span>
                {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
                <img className={styles.actHand} src="/playbill/hand.png" alt="" aria-hidden="true" />
              </div>
              <h2 className={`${styles.actTitle} rq-caps rq-tfade`}>Move up the line</h2>
              <p className={styles.actText}>
                Each confirmed referral advances your number. Watch the stub tick toward No. 1.
              </p>
            </li>
          </ol>
        </div>

        {/* flanking engravings, anchored to the foot of the sheet */}
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
        <img className={styles.strongman} src="/playbill/strongman.png" alt="" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
        <img className={styles.horse} src="/playbill/horse.png" alt="" aria-hidden="true" />
        {waitlist.powered_by && (
          <div className={styles.footer}>
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
            <img className={`${styles.footerFlr} ${styles.flrL}`} src="/playbill/star.png" alt="" aria-hidden="true" />
            <a className={`${styles.footerTxt} rq-caps rq-tfade`} href={REPO_URL} target="_blank" rel="noopener noreferrer">
              Powered by RefQueue
            </a>
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
            <img className={styles.footerFlr} src="/playbill/star.png" alt="" aria-hidden="true" />
          </div>
        )}
      </div>
    </main>
  )
}
