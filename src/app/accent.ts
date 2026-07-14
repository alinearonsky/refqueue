import type { CSSProperties } from 'react'
import type { ThemeConfig } from '@/lib/config'

const CREAM = '#f7ecd2' // brand cream — text on a dark accent
const DARK = '#241c14' // sepia ink — text on a light accent

function parseHex(color: string): [number, number, number] | null {
  const m = color.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(m)) {
    return [0, 1, 2].map(i => parseInt(m[i] + m[i], 16)) as [number, number, number]
  }
  if (/^[0-9a-fA-F]{6}$/.test(m)) {
    return [0, 2, 4].map(i => parseInt(m.slice(i, i + 2), 16)) as [number, number, number]
  }
  return null
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const f = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(a: number, b: number): number {
  const hi = Math.max(a, b)
  const lo = Math.min(a, b)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Inline CSS custom properties carrying the maker's accent. Consumed via
 * var(--accent) / var(--accent-text), so an unset accent renders the default
 * playbill red. `--accent-text` is chosen for contrast: whichever of cream /
 * sepia-ink reads better on the accent fill — so a maker's light OR dark brand
 * color keeps a legible CTA (a light accent no longer forces unreadable white).
 */
export function accentStyle(theme: ThemeConfig): CSSProperties | undefined {
  if (!theme.accentColor) return undefined
  const rgb = parseHex(theme.accentColor)
  let accentText = CREAM
  if (rgb) {
    const lum = relativeLuminance(rgb)
    accentText = contrast(lum, relativeLuminance(parseHex(DARK)!)) >
      contrast(lum, relativeLuminance(parseHex(CREAM)!))
      ? DARK
      : CREAM
  }
  return { '--accent': theme.accentColor, '--accent-text': accentText } as CSSProperties
}
