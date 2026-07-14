'use client'

import { useState } from 'react'
import styles from './SignupForm.module.css'

interface SignupResult {
  referralCode: string
  verified: boolean
  position: number
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_input: 'That doesn’t look like a valid email address.',
  disposable_email: 'Disposable email addresses aren’t accepted — please use your real one.',
  rate_limited: 'Too many signups from your network right now. Try again in a few minutes.',
  waitlist_not_found: 'This waitlist isn’t set up yet. Try again shortly.',
}

export function SignupForm({
  waitlistSlug,
  referralCode,
  ctaLabel = 'Join the waitlist',
}: {
  waitlistSlug: string
  referralCode?: string
  ctaLabel?: string
}) {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SignupResult | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waitlistSlug, email, ref: referralCode }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(ERROR_MESSAGES[json.error] ?? 'Something went wrong. Please try again.')
        return
      }
      setResult(json as SignupResult)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  if (result) {
    return result.verified ? (
      <p className={styles.success}>
        You’re already on the list at <strong className={styles.pos}>#{result.position}</strong>.{' '}
        <a className={styles.statusLink} href={`/status/${result.referralCode}`}>
          View your status →
        </a>
      </p>
    ) : (
      <p className={styles.success}>
        You’re <strong className={styles.pos}>#{result.position}</strong> in line. Check your inbox and confirm your
        email to lock in your spot — that’s where your referral link lives.
      </p>
    )
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <div className={styles.field}>
        <input
          className={styles.input}
          type="email"
          required
          placeholder="you@example.com"
          aria-label="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={pending}
        />
        <button className={styles.button} type="submit" disabled={pending}>
          {pending ? 'Joining…' : ctaLabel}
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  )
}
