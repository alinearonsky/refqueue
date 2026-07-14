import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getMakerUser } from '@/lib/auth/server'
import { getWaitlistConfig } from '@/lib/config'
import { buildDashboardData } from '@/lib/dashboard/metrics'
import { createServiceClient } from '@/lib/db/client'
import { listAllSignups } from '@/lib/db/signups'
import { getWaitlistBySlug } from '@/lib/db/waitlists'
import { SignupsChart } from './SignupsChart'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false },
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export default async function DashboardPage() {
  // Middleware already gates this route; belt-and-braces for direct renders.
  if (!(await getMakerUser())) redirect('/login')

  const config = getWaitlistConfig()
  const db = createServiceClient()
  const waitlist = await getWaitlistBySlug(db, config.slug)
  const rows = waitlist ? await listAllSignups(db, waitlist.id) : []
  const data = buildDashboardData(rows, new Date())

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{waitlist?.name ?? config.name}</h1>
          <p className={styles.subtitle}>Waitlist dashboard</p>
        </div>
        <div className={styles.headerActions}>
          <a className={styles.exportLink} href="/api/dashboard/export">
            Export CSV
          </a>
          <form action="/api/auth/logout" method="post">
            <button className={styles.logoutButton} type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className={styles.cards} aria-label="Totals">
        <div className={styles.card}>
          <span className={styles.cardValue}>{data.total}</span>
          <span className={styles.cardLabel}>Total signups</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue}>{data.verifiedCount}</span>
          <span className={styles.cardLabel}>Verified</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardValue}>{data.pendingCount}</span>
          <span className={styles.cardLabel}>Pending confirmation</span>
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Signups (last 30 days)</h2>
        <SignupsChart buckets={data.signupsPerDay} />
      </section>

      {data.topReferrers.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Top referrers</h2>
          <ol className={styles.referrerList}>
            {data.topReferrers.map((r) => (
              <li key={r.email} className={styles.referrerItem}>
                <span>{r.email}</span>
                <span className={styles.referrerCount}>
                  {r.confirmedReferrals} confirmed {r.confirmedReferrals === 1 ? 'referral' : 'referrals'}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Signups</h2>
        {data.entries.length === 0 ? (
          <p className={styles.empty}>No signups yet. Share your waitlist page to get started.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Referrals</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.referralCode}>
                    <td>{e.position ?? 'n/a'}</td>
                    <td>{e.email}</td>
                    <td>
                      <span className={e.verified ? styles.badgeVerified : styles.badgePending}>
                        {e.verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td>{e.confirmedReferrals}</td>
                    <td>{dateFmt.format(new Date(e.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
