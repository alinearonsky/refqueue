import { test, expect, describe } from 'vitest'
import { buildConfirmationEmail, buildMilestoneEmail } from './templates'

describe('buildConfirmationEmail', () => {
  test('includes the waitlist name in the subject and the verify link in the body', () => {
    const { subject, html } = buildConfirmationEmail({
      waitlistName: 'My App',
      verifyUrl: 'http://localhost:3000/api/verify?token=abc123XY',
    })
    expect(subject).toContain('My App')
    expect(html).toContain('http://localhost:3000/api/verify?token=abc123XY')
  })
  test('escapes HTML in the waitlist name (defense against maker-supplied markup)', () => {
    const { html } = buildConfirmationEmail({
      waitlistName: '<script>alert(1)</script>',
      verifyUrl: 'http://x/verify',
    })
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('buildMilestoneEmail', () => {
  test('names the unlocked reward and the referral count', () => {
    const { subject, html } = buildMilestoneEmail({
      waitlistName: 'My App',
      unlockedLabel: 'Early access',
      confirmedReferrals: 3,
    })
    expect(subject).toContain('Early access')
    expect(html).toContain('Early access')
    expect(html).toContain('3')
  })
  test('escapes HTML in the unlocked label', () => {
    const { html } = buildMilestoneEmail({
      waitlistName: 'A',
      unlockedLabel: '<b>x</b>',
      confirmedReferrals: 1,
    })
    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('&lt;b&gt;')
  })
})
