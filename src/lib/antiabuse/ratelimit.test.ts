import { test, expect, describe, vi, beforeEach, afterEach } from 'vitest'
import { InMemoryRateLimiter } from './ratelimit'

describe('InMemoryRateLimiter', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  test('allows up to `max` hits then blocks within the window', async () => {
    const rl = new InMemoryRateLimiter({ max: 3, windowMs: 60_000 })
    expect(await rl.allow('ip:1')).toBe(true)
    expect(await rl.allow('ip:1')).toBe(true)
    expect(await rl.allow('ip:1')).toBe(true)
    expect(await rl.allow('ip:1')).toBe(false) // 4th within window
  })

  test('separate keys have separate budgets', async () => {
    const rl = new InMemoryRateLimiter({ max: 1, windowMs: 60_000 })
    expect(await rl.allow('ip:1')).toBe(true)
    expect(await rl.allow('ip:2')).toBe(true)
    expect(await rl.allow('ip:1')).toBe(false)
  })

  test('budget resets after the window elapses', async () => {
    const rl = new InMemoryRateLimiter({ max: 1, windowMs: 60_000 })
    expect(await rl.allow('ip:1')).toBe(true)
    expect(await rl.allow('ip:1')).toBe(false)
    vi.advanceTimersByTime(60_001)
    expect(await rl.allow('ip:1')).toBe(true)
  })
})
