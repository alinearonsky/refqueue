import type { EmailMessage } from './types'
import { FakeEmailSender } from './fake'

/**
 * Dev fallback (no provider configured): records like the fake AND prints the
 * message, so the verify link is reachable from the dev-server console.
 */
export class LoggingEmailSender extends FakeEmailSender {
  async send(msg: EmailMessage): Promise<void> {
    await super.send(msg)
    console.log(`[email] to=${msg.to} subject="${msg.subject}"\n${msg.html}`)
  }
}
