export interface ConfirmationEmailInput {
  waitlistName: string
  verifyUrl: string
}

export interface MilestoneEmailInput {
  waitlistName: string
  unlockedLabel: string
  confirmedReferrals: number
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildConfirmationEmail(input: ConfirmationEmailInput): { subject: string; html: string } {
  const name = escapeHtml(input.waitlistName)
  const subject = `Confirm your spot on the ${input.waitlistName} waitlist`
  const html = [
    `<p>Thanks for joining the ${name} waitlist!</p>`,
    `<p>Confirm your email to lock in your spot: <a href="${input.verifyUrl}">Confirm my spot</a></p>`,
    `<p>If you didn't sign up, you can safely ignore this email.</p>`,
  ].join('\n')
  return { subject, html }
}

export function buildMilestoneEmail(input: MilestoneEmailInput): { subject: string; html: string } {
  const name = escapeHtml(input.waitlistName)
  const label = escapeHtml(input.unlockedLabel)
  const people = input.confirmedReferrals === 1 ? 'person' : 'people'
  const subject = `You unlocked ${input.unlockedLabel} on ${input.waitlistName}`
  const html = [
    `<p>Nice work — you've referred ${input.confirmedReferrals} ${people} to ${name}.</p>`,
    `<p>You just unlocked: <strong>${label}</strong>.</p>`,
  ].join('\n')
  return { subject, html }
}
