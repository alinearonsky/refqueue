import styles from './PoweredBy.module.css'

const REPO_URL = 'https://github.com/alinearonsky/refqueue'

/**
 * The self-distribution credit (PRODUCT.md): on by default on every public
 * page, removable via POWERED_BY=false, forcing it would be user-hostile.
 */
export function PoweredBy({ enabled }: { enabled: boolean }) {
  if (!enabled) return null
  return (
    <a className={styles.credit} href={REPO_URL} target="_blank" rel="noopener noreferrer">
      Powered by <strong>Refqueue</strong>
    </a>
  )
}
