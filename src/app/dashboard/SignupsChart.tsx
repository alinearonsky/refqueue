import type { DayBucket } from '@/lib/dashboard/metrics'
import styles from './page.module.css'

/** Dependency-free 30-day bar chart; heights scale to the busiest day. */
export function SignupsChart({ buckets }: { buckets: DayBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count))
  const barWidth = 100 / buckets.length

  return (
    <svg
      className={styles.chart}
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Signups per day over the last ${buckets.length} days`}
    >
      {buckets.map((b, i) => {
        const height = (b.count / max) * 36
        return (
          <rect
            key={b.day}
            x={i * barWidth + barWidth * 0.15}
            y={40 - height}
            width={barWidth * 0.7}
            height={height}
            rx={0.4}
            className={styles.chartBar}
          >
            <title>{`${b.day}: ${b.count}`}</title>
          </rect>
        )
      })}
    </svg>
  )
}
