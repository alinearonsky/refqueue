import { collectProductionConfigErrors } from '@/lib/config'

/**
 * Runs once when the server boots (Next.js instrumentation). In production we
 * refuse to start on a broken config so a misconfigured deploy fails loudly
 * rather than silently swallowing verification emails. Dev/test skip this —
 * the LoggingEmailSender fallback and localhost APP_BASE_URL are intended there.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.NODE_ENV !== 'production') return

  const errors = collectProductionConfigErrors()
  if (errors.length > 0) {
    const message = ['RefQueue cannot start — fix these environment variables:', ...errors.map((e) => `  • ${e}`)].join(
      '\n',
    )
    throw new Error(message)
  }
}
