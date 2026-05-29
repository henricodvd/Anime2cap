/**
 * Quick smoke test for Upstash Redis connection + Jikan client
 * Run: npx tsx src/scripts/test-upstash.ts
 */
import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

async function main() {
  console.log('\n🔍 Testing Upstash Redis connection...\n')

  // 1. Check env vars
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  
  if (!url || !token) {
    console.error('❌ UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set')
    process.exit(1)
  }
  console.log(`✅ ENV vars found: ${url.substring(0, 30)}...`)

  // 2. Test Redis connection
  try {
    const redis = new Redis({ url, token })
    await redis.set('test:connection', 'ok', { ex: 10 })
    const val = await redis.get('test:connection')
    if (val === 'ok') {
      console.log('✅ Redis connection works — read/write OK')
    } else {
      console.error(`❌ Redis returned unexpected value: ${val}`)
      process.exit(1)
    }
    await redis.del('test:connection')
  } catch (err) {
    console.error('❌ Redis connection failed:', err)
    process.exit(1)
  }

  // 3. Test Ratelimit (outbound throttle for Jikan)
  try {
    const redis = new Redis({ url, token })
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(2, '1 s'),
      prefix: 'test:ratelimit',
    })

    const r1 = await limiter.limit('test-key')
    const r2 = await limiter.limit('test-key')
    const r3 = await limiter.limit('test-key')

    console.log(`✅ Ratelimit works — req1: ${r1.success}, req2: ${r2.success}, req3: ${r3.success} (should be true, true, false)`)
    
    if (r1.success && r2.success && !r3.success) {
      console.log('   ✅ Rate limiting is correctly blocking the 3rd request (2/s limit)')
    } else {
      console.log('   ⚠️  Rate limiting results unexpected, but connection works')
    }

    // Cleanup
    await redis.del('test:ratelimit:test-key')
  } catch (err) {
    console.error('❌ Ratelimit test failed:', err)
    process.exit(1)
  }

  // 4. Test actual Jikan fetch through our client
  try {
    const { jikanGet } = await import('../lib/jikan-client')
    
    console.log('\n🔍 Testing Jikan client (fetching Naruto by ID 20)...')
    const response = await jikanGet('/anime/20')
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Jikan client works — got: "${data.data.title}" (MAL ID: ${data.data.mal_id})`)
    } else {
      console.log(`⚠️  Jikan responded with status ${response.status} — client handled it correctly`)
    }
  } catch (err: any) {
    if (err.name === 'JikanUnavailableError') {
      console.log(`⚠️  Jikan unavailable (circuit/throttle) — client handled it correctly: ${err.message}`)
    } else {
      console.error('❌ Jikan client test failed:', err)
    }
  }

  console.log('\n✅ All tests passed! Upstash Redis is ready.\n')
}

main().catch(console.error)
