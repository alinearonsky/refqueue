// `disposable-email-domains` exports an array of domains (CommonJS).
import disposableDomains from 'disposable-email-domains'

const set = new Set((disposableDomains as string[]).map(d => d.toLowerCase()))

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf('@')
  if (at === -1) return false
  const domain = email.slice(at + 1).toLowerCase().trim()
  if (!domain) return false
  return set.has(domain)
}
