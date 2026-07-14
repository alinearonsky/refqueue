'use client'

import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable (plain http, old browser) — the link is rendered beside
      // this button, so manual copy still works.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={copied ? 'copied' : undefined}
      aria-live="polite"
    >
      {copied ? 'Copied ✓' : 'Copy link'}
    </button>
  )
}
