import Link from 'next/link'
import styles from './PitchLanding.module.css'

const REPO_URL = 'https://github.com/alinearonsky/refqueue'
const DEMO_URL = '/demo'
const CREATOR_URL = 'https://alinearonsky.com'
// Clone-and-deploy to Vercel, prompting for the Supabase/email/maker env vars
// (mirrors the README "Deploy to Vercel" button). Distinct from the repo/star link.
const DEPLOY_URL =
  'https://vercel.com/new/clone?repository-url=https://github.com/alinearonsky/refqueue&env=SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,SUPABASE_ANON_KEY,APP_BASE_URL,WAITLIST_NAME,EMAIL_FROM,RESEND_API_KEY,MAKER_EMAIL,MAKER_PASSWORD&envDescription=Supabase%20keys%2C%20your%20public%20URL%2C%20an%20email%20provider%2C%20and%20maker%20login'

const ACTS = [
  {
    no: 'I.',
    title: 'Join the line',
    body: 'A visitor leaves their email and receives a numbered stub: their place in line, on the spot.',
  },
  {
    no: 'II.',
    title: 'Send your friends',
    body: 'Each signup gets a referral link. Every friend who joins through it is one seat closer to the front.',
  },
  {
    no: 'III.',
    title: 'Move up the line',
    body: 'A referral counts only after the friend confirms their email, so the numbers stay honest.',
  },
]

const BILL = [
  {
    title: 'Free & MIT-licensed',
    body: 'No seat caps, no locked features, no monthly bill. Fork it, ship it, keep it.',
  },
  {
    title: 'Self-hosted',
    body: 'Your signups live in your own database. One-click Vercel deploy or `docker compose up`.',
  },
  {
    title: 'Referrals, not paywalled',
    body: 'The refer-a-friend-to-move-up loop that GetWaitlist and Viral Loops keep behind a paywall.',
  },
  {
    title: 'Counts you can trust',
    body: 'A referral lands only after the friend confirms their email, so a fake one costs a real inbox.',
  },
]

/**
 * The product pitch shown at `/` on refqueue.com (getDemoSiteEnabled). A playbill that
 * advertises Refqueue the tool, then hands off to the live demo and the repo.
 */
export function PitchLanding() {
  return (
    <main className={`rq-surface ${styles.main}`}>
      <div className={`${styles.sheet} rq-sheet rq-enter`}>
        <div className={`rq-frame ${styles.frame}`}>
          {/* Masthead */}
          <header className={styles.masthead}>
            <span className={`${styles.wordmark} rq-caps`}>Refqueue</span>
            <nav className={styles.nav}>
              <a className={`${styles.navLink} rq-caps`} href="#how">
                How it works
              </a>
              <Link className={`${styles.navLink} rq-caps`} href={DEMO_URL}>
                Demo
              </Link>
              <a
                className={`${styles.navStar} rq-caps`}
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                ★ GitHub
              </a>
            </nav>
          </header>

          {/* Hero */}
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <span className={`${styles.eyebrow} rq-caps rq-tfade`}>
                Open-source waitlist · Self-hosted · MIT
              </span>
              <h1 className={`${styles.headline} rq-fade`}>
                Skip the line.
              </h1>
              <p className={styles.lede}>
                Refqueue is a free, self-hosted waitlist with built-in referrals. An
                open-source, free alternative to GetWaitlist or Viral Loops.
              </p>
              <div className={styles.ctaRow}>
                <Link className={`${styles.ctaPrimary} rq-caps`} href={DEMO_URL}>
                  View live demo
                </Link>
                <a className={`${styles.ctaGhost} rq-caps`} href="#how">
                  How it works
                </a>
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
                alt="A vintage Refqueue Admit One theatre ticket"
              />
            </div>
          </section>

          {/* Separator */}
          <div className={styles.sep} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
            <img className={`${styles.sepFlr} ${styles.sepL}`} src="/playbill/star.png" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
            <img className={`${styles.sepFlr} ${styles.sepR}`} src="/playbill/star.png" alt="" />
          </div>

          {/* How it works */}
          <section id="how" className={styles.section}>
            <h2 className={`${styles.sectionTitle} rq-caps rq-tfade`}>How it works</h2>
            <ol className={styles.acts}>
              {ACTS.map((act) => (
                <li key={act.no} className={styles.act}>
                  <div className={styles.actTop}>
                    <span className={styles.actNo}>{act.no}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
                    <img className={styles.actHand} src="/playbill/hand.png" alt="" aria-hidden="true" />
                  </div>
                  <h3 className={`${styles.actTitle} rq-caps rq-tfade`}>{act.title}</h3>
                  <p className={styles.actText}>{act.body}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Why Refqueue */}
          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} rq-caps rq-tfade`}>Why Refqueue</h2>
            <ul className={styles.bill}>
              {BILL.map((item) => (
                <li key={item.title} className={styles.billItem}>
                  <span className={styles.billMark} aria-hidden="true" />
                  <div>
                    <h3 className={`${styles.billTitle} rq-caps`}>{item.title}</h3>
                    <p className={styles.billText}>{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Closing call to action */}
          <section className={styles.close}>
            <h2 className={`${styles.closeTitle} rq-fade`}>Free forever.</h2>
            <p className={styles.closeSub}>Star it for later, or deploy your own in minutes.</p>
            <div className={styles.ctaRow}>
              <a
                className={`${styles.ctaPrimary} rq-caps`}
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                ★ Star on GitHub
              </a>
              <a
                className={`${styles.ctaGhost} rq-caps`}
                href={DEPLOY_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Deploy your own
              </a>
            </div>
            <ul className={styles.badges}>
              <li className={`${styles.badge} rq-caps`}>MIT</li>
              <li className={`${styles.badge} rq-caps`}>Next.js + Supabase</li>
              <li className={`${styles.badge} rq-caps`}>No tracking self-hosted</li>
            </ul>
          </section>

          {/* Flanking engravings + maker credit, INSIDE the frame so the bottom
              keyline never cuts across them (they overlap the acts' side margins). */}
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
          <img className={styles.strongman} src="/playbill/strongman.png" alt="" aria-hidden="true" />
          {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
          <img className={styles.horse} src="/playbill/horse.png" alt="" aria-hidden="true" />

          {/* Foot of the sheet: credit back to the maker */}
          <footer className={styles.foot}>
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
            <img className={`${styles.footFlr} ${styles.footFlrL}`} src="/playbill/star.png" alt="" aria-hidden="true" />
            <span className={`${styles.footTxt} rq-caps rq-tfade`}>
              Built by{' '}
              <a href={CREATOR_URL} target="_blank" rel="noopener noreferrer">
                Aline Aronsky
              </a>
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element -- decorative local asset */}
            <img className={styles.footFlr} src="/playbill/star.png" alt="" aria-hidden="true" />
          </footer>
        </div>
      </div>
    </main>
  )
}
