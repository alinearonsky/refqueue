import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getMakerUser } from '@/lib/auth/server'
import { getMakerCredentials } from '@/lib/config'
import { createServiceClient } from '@/lib/db/client'
import { ensureMakerAccount } from '@/lib/db/maker'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Maker login',
  robots: { index: false },
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  if (await getMakerUser()) redirect('/dashboard')

  const creds = getMakerCredentials()
  if (creds) {
    // Best-effort provisioning, a transient failure must not take the page down.
    try {
      await ensureMakerAccount(createServiceClient(), creds)
    } catch (err) {
      console.error('login: maker provisioning failed', err)
    }
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Maker login</h1>

      {!creds && (
        <p className={styles.notice}>
          Dashboard is not configured. Set <code>MAKER_EMAIL</code> and <code>MAKER_PASSWORD</code> in
          your environment, then reload this page.
        </p>
      )}

      {error && (
        <p role="alert" className={styles.error}>
          Invalid email or password.
        </p>
      )}

      <form className={styles.form} action="/api/auth/login" method="post">
        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input className={styles.input} id="email" name="email" type="email" required autoComplete="username" />

        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          className={styles.input}
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />

        <button className={styles.button} type="submit" disabled={!creds}>
          Sign in
        </button>
      </form>
    </main>
  )
}
