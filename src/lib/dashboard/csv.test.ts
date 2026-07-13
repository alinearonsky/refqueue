import { describe, expect, it } from 'vitest'
import type { DashboardEntry } from './metrics'
import { signupsToCsv } from './csv'

function entry(overrides: Partial<DashboardEntry>): DashboardEntry {
  return {
    email: 'a@x.com',
    verified: true,
    position: 1,
    confirmedReferrals: 0,
    referralCode: 'AbCdEfGh',
    createdAt: '2026-07-10T10:00:00Z',
    verifiedAt: '2026-07-10T10:05:00Z',
    ...overrides,
  }
}

describe('signupsToCsv', () => {
  it('emits a header row and one line per entry, ending with a newline', () => {
    const csv = signupsToCsv([entry({}), entry({ email: 'b@x.com', verified: false, position: null, verifiedAt: null })])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('email,verified,position,confirmed_referrals,referral_code,created_at,verified_at')
    expect(lines[1]).toBe('a@x.com,true,1,0,AbCdEfGh,2026-07-10T10:00:00Z,2026-07-10T10:05:00Z')
    expect(lines[2]).toBe('b@x.com,false,,0,AbCdEfGh,2026-07-10T10:00:00Z,')
    expect(lines[3]).toBe('')
    expect(lines).toHaveLength(4)
  })

  it('quotes fields containing commas, quotes, or newlines per RFC 4180', () => {
    const csv = signupsToCsv([entry({ email: '"weird,\nemail"@x.com' })])
    expect(csv.split('\n')[1].startsWith('"""weird,')).toBe(true)
    expect(csv).toContain('email""@x.com"')
  })

  it('neutralizes spreadsheet formula injection', () => {
    const csv = signupsToCsv([entry({ email: '=HYPERLINK("http://evil")@x.com' })])
    const dataLine = csv.split('\n')[1]
    expect(dataLine.startsWith('"\'=HYPERLINK(')).toBe(true)
  })
})
