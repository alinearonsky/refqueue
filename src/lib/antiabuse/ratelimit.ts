export interface RateLimiter {
  /** Returns true if the action is allowed (and records it), false if over budget. */
  allow(key: string): Promise<boolean>
}

interface Bucket { count: number; resetAt: number }

export class InMemoryRateLimiter implements RateLimiter {
  private readonly max: number
  private readonly windowMs: number
  private readonly buckets = new Map<string, Bucket>()

  constructor(opts: { max: number; windowMs: number }) {
    this.max = opts.max
    this.windowMs = opts.windowMs
  }

  async allow(key: string): Promise<boolean> {
    const now = Date.now()
    const bucket = this.buckets.get(key)
    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs })
      return true
    }
    if (bucket.count >= this.max) return false
    bucket.count += 1
    return true
  }
}
