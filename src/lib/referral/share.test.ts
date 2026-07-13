import { test, expect, describe } from 'vitest'
import { buildReferralLink, buildShareLinks } from './share'

describe('buildReferralLink', () => {
  test('appends the code as ?ref= on the base URL', () => {
    expect(buildReferralLink('Ab12Cd34', 'https://wl.example.com')).toBe('https://wl.example.com/?ref=Ab12Cd34')
  })
})

describe('buildShareLinks', () => {
  const link = 'https://wl.example.com/?ref=Ab12Cd34'
  const links = buildShareLinks(link, 'Acme Launch')

  test('every target embeds the URL-encoded referral link', () => {
    const encoded = encodeURIComponent(link)
    expect(links.x).toContain(encoded)
    expect(links.whatsapp).toContain(encoded)
    expect(links.linkedin).toContain(encoded)
    expect(links.email).toContain(encoded)
  })

  test('points at the right services', () => {
    expect(links.x).toMatch(/^https:\/\/twitter\.com\/intent\/tweet\?/)
    expect(links.whatsapp).toMatch(/^https:\/\/wa\.me\/\?text=/)
    expect(links.linkedin).toMatch(/^https:\/\/www\.linkedin\.com\/sharing\/share-offsite\/\?url=/)
    expect(links.email).toMatch(/^mailto:\?subject=/)
  })

  test('mentions the waitlist name in the share text', () => {
    expect(decodeURIComponent(links.x)).toContain('Acme Launch')
  })
})
