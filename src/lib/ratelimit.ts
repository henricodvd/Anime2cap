import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

function createRateLimit(requests: number, window: string): Ratelimit | null {
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      return new Ratelimit({
        redis: typeof Redis.fromEnv === 'function' ? Redis.fromEnv() : ({} as any),
        limiter: Ratelimit.slidingWindow(requests, window as any),
      })
    }
  } catch {
    // ignore — rate limiting degrades gracefully
  }
  return null
}

// GET /api/search — 30 req/min
export const searchRateLimit = createRateLimit(30, '1 m')

// GET /api/title/[slug] — 60 req/min
export const titleRateLimit = createRateLimit(60, '1 m')

// GET /api/convert — 60 req/min
export const convertRateLimit = createRateLimit(60, '1 m')

// POST /api/admin/mappings — 10 req/min
export const adminRateLimit = createRateLimit(10, '1 m')
