import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// ---------------------------------------------------------------------------
// Jikan API Client — Centralized with Upstash-backed protections
// ---------------------------------------------------------------------------
// All shared state (throttle, circuit breaker) uses Upstash Redis so it works
// correctly across Vercel serverless instances. Retry/backoff is per-request
// (in-memory), which is fine since it lives within a single invocation.
// ---------------------------------------------------------------------------

const JIKAN_BASE_URL = process.env.JIKAN_API_URL || 'https://api.jikan.moe/v4'

// --- Redis singleton (lazy) ------------------------------------------------

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (_redis) return _redis
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    _redis = Redis.fromEnv()
    return _redis
  }
  return null
}

// --- Outbound throttle (Upstash Ratelimit) ---------------------------------
// Jikan public API: 3 req/s, 60 req/min. We use 2/s with margin.

let _jikanLimiter: Ratelimit | null = null

function getJikanLimiter(): Ratelimit | null {
  if (_jikanLimiter) return _jikanLimiter
  const redis = getRedis()
  if (!redis) return null
  _jikanLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(2, '1 s'),
    prefix: 'jikan:outbound',
  })
  return _jikanLimiter
}

// --- Circuit breaker (Redis keys with TTL) ---------------------------------

const CIRCUIT_FAILURES_KEY = 'jikan:circuit:failures'
const CIRCUIT_OPEN_KEY = 'jikan:circuit:open'
const CIRCUIT_THRESHOLD = 5       // consecutive failures before opening
const CIRCUIT_RECOVERY_SEC = 60   // seconds the circuit stays open

async function isCircuitOpen(): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false // no Redis → circuit always closed (best-effort)
  try {
    const val = await redis.get<string>(CIRCUIT_OPEN_KEY)
    return val === 'true'
  } catch {
    return false // Redis failure shouldn't block requests
  }
}

async function recordSuccess(): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.del(CIRCUIT_FAILURES_KEY)
  } catch {
    // non-critical
  }
}

async function recordFailure(): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    const pipeline = redis.pipeline()
    pipeline.incr(CIRCUIT_FAILURES_KEY)
    pipeline.expire(CIRCUIT_FAILURES_KEY, CIRCUIT_RECOVERY_SEC * 2)
    const results = await pipeline.exec()
    const failures = results[0] as number

    if (failures >= CIRCUIT_THRESHOLD) {
      await redis.set(CIRCUIT_OPEN_KEY, 'true', { ex: CIRCUIT_RECOVERY_SEC })
    }
  } catch {
    // non-critical
  }
}

// --- Throttle wait ---------------------------------------------------------

async function waitForThrottle(): Promise<boolean> {
  const limiter = getJikanLimiter()
  if (!limiter) return true // no Redis → no throttle (best-effort)

  // Try up to 3 times with 600ms waits between attempts
  for (let i = 0; i < 3; i++) {
    try {
      const { success } = await limiter.limit('global')
      if (success) return true
    } catch {
      return true // Redis failure → allow the request
    }
    await sleep(600)
  }
  return false
}

// --- Helpers ---------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// --- Custom error ----------------------------------------------------------

export class JikanUnavailableError extends Error {
  constructor(message = 'Jikan API is temporarily unavailable') {
    super(message)
    this.name = 'JikanUnavailableError'
  }
}

// --- Main fetch function ---------------------------------------------------

const MAX_RETRIES = 3

/**
 * Fetch from the Jikan API with outbound throttle, circuit breaker, and
 * retry with exponential backoff.
 *
 * - 429 / 5xx → retries with backoff (per-request, in-memory)
 * - 404       → returns the response immediately (not an error)
 * - Circuit opens after 5 consecutive failures, recovers after 60s
 *
 * @throws {JikanUnavailableError} when circuit is open or all retries fail
 */
export async function jikanFetch(url: string): Promise<Response> {
  // 1. Circuit breaker check
  if (await isCircuitOpen()) {
    throw new JikanUnavailableError('Circuit breaker is open — Jikan resting')
  }

  // 2. Outbound throttle
  const allowed = await waitForThrottle()
  if (!allowed) {
    throw new JikanUnavailableError('Outbound rate limit to Jikan exceeded')
  }

  // 3. Fetch with retry + exponential backoff
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10_000), // 10s timeout per attempt
      })

      // Success — reset circuit
      if (response.ok) {
        await recordSuccess()
        return response
      }

      // 404 — Jikan is working fine, just doesn't have this anime
      if (response.status === 404) {
        await recordSuccess()
        return response
      }

      // 429 — respect Retry-After or use exponential backoff
      if (response.status === 429) {
        await recordFailure()
        const retryAfter = response.headers.get('Retry-After')
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.pow(2, attempt) * 1000
        await sleep(Math.min(waitMs, 5000))
        continue
      }

      // 5xx — Jikan is struggling
      if (response.status >= 500) {
        await recordFailure()
        await sleep(Math.pow(2, attempt) * 1000)
        continue
      }

      // Other errors (400, etc.) — don't retry, return as-is
      return response
    } catch (error) {
      // Network / timeout errors
      lastError = error instanceof Error ? error : new Error(String(error))
      await recordFailure()
      if (attempt < MAX_RETRIES - 1) {
        await sleep(Math.pow(2, attempt) * 1000)
      }
    }
  }

  throw new JikanUnavailableError(
    `Jikan API failed after ${MAX_RETRIES} retries: ${lastError?.message || 'Unknown error'}`
  )
}

// --- Convenience wrapper ---------------------------------------------------

/**
 * Fetch a Jikan endpoint by path. Prepends the configured base URL.
 *
 * @example jikanGet(`/anime/1`)       → GET https://api.jikan.moe/v4/anime/1
 * @example jikanGet(`/anime?q=naruto`) → GET https://api.jikan.moe/v4/anime?q=naruto
 */
export async function jikanGet(path: string): Promise<Response> {
  const url = `${JIKAN_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
  return jikanFetch(url)
}
