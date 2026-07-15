import styles from './DemoBar.module.css'

const REPO_URL = 'https://github.com/alinearonsky/refqueue'

/**
 * Slim bar shown above the live demo (/demo) so a visitor who lands there directly
 * knows it's a demo and can reach the pitch and the repo.
 */
export function DemoBar() {
  return (
    <div className={`rq-surface ${styles.bar}`}>
      <span className={`${styles.tag} rq-caps`}>Live demo</span>
      <span className={styles.txt}>A working Refqueue waitlist. Try it.</span>
      <span className={styles.links}>
        <a className={`${styles.link} rq-caps`} href="/">
          What is Refqueue?
        </a>
        <a
          className={`${styles.star} rq-caps`}
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          ★ Star on GitHub
        </a>
      </span>
    </div>
  )
}
