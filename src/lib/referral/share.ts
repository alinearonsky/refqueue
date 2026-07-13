import { getAppBaseUrl } from '@/lib/config'

export function buildReferralLink(code: string, base: string = getAppBaseUrl()): string {
  return `${base}/?ref=${code}`
}

export interface ShareLinks {
  x: string
  whatsapp: string
  linkedin: string
  email: string
}

/** Prebuilt share-intent URLs for the status page. Text stays honest: referring moves the referrer up. */
export function buildShareLinks(referralLink: string, waitlistName: string): ShareLinks {
  const text = `Join the ${waitlistName} waitlist through my link:`
  const url = encodeURIComponent(referralLink)
  const msg = encodeURIComponent(`${text} ${referralLink}`)
  return {
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`,
    whatsapp: `https://wa.me/?text=${msg}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    email: `mailto:?subject=${encodeURIComponent(`Join me on the ${waitlistName} waitlist`)}&body=${msg}`,
  }
}
