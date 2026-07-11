import type { EmailSender } from './types'
import { createEmailSender } from './factory'

let cached: EmailSender | null = null

/** Lazily builds (and caches) the process-wide email sender from env. */
export function getEmailSender(): EmailSender {
  if (!cached) cached = createEmailSender()
  return cached
}

/** Test seam: inject a sender (e.g. FakeEmailSender), or pass null to reset. */
export function setEmailSenderForTest(sender: EmailSender | null): void {
  cached = sender
}
