import type { DashboardEntry } from './metrics'

const HEADER = 'email,verified,position,confirmed_referrals,referral_code,created_at,verified_at'

/**
 * RFC 4180 escaping plus a spreadsheet formula-injection guard: emails are
 * attacker-controlled, so fields starting with = + - @ tab or CR get a
 * leading apostrophe before quoting (Excel/Sheets then treat them as text).
 */
function escapeField(value: string): string {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  if (/[",\n\r]/.test(guarded)) return `"${guarded.replace(/"/g, '""')}"`
  return guarded
}

export function signupsToCsv(entries: DashboardEntry[]): string {
  const lines = entries.map((e) =>
    [
      e.email,
      String(e.verified),
      e.position === null ? '' : String(e.position),
      String(e.confirmedReferrals),
      e.referralCode,
      e.createdAt,
      e.verifiedAt ?? '',
    ]
      .map(escapeField)
      .join(','),
  )
  return [HEADER, ...lines].join('\n') + '\n'
}
