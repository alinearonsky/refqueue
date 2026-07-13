import type { CSSProperties } from 'react'
import type { ThemeConfig } from '@/lib/config'

/**
 * Inline CSS custom properties carrying the maker's accent. Consumed via
 * var(--accent, var(--foreground)) / var(--accent-text, var(--background)),
 * so an unset accent renders exactly the pre-theming look. Text is fixed
 * white — .env.example tells makers to pick an accent dark enough for it.
 */
export function accentStyle(theme: ThemeConfig): CSSProperties | undefined {
  if (!theme.accentColor) return undefined
  return { '--accent': theme.accentColor, '--accent-text': '#ffffff' } as CSSProperties
}
