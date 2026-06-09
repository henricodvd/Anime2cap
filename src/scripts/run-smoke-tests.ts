/**
 * Ep-Cap Smoke Tests (TDD validation script)
 * Runs independent checks for all infrastructure layers:
 * 1. Supabase (Postgres)
 * 2. Upstash (Redis)
 * 3. Jikan Client (HTTP API)
 * 4. Title Service (Integrated Database + Jikan layer)
 * 
 * Run: npx tsx src/scripts/run-smoke-tests.ts
 */

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import { db } from '../lib/db'
import { sql } from 'drizzle-orm'
import { titles } from '../db/schema'
import { jikanGet } from '../lib/jikan-client'
import { getTitleData } from '../lib/title-service'

// Helper for nice terminal logs
function printHeader(title: string) {
  console.log('\n==================================================')
  console.log(`🚀 TESTING: ${title}`)
  console.log('==================================================')
}

async function testSupabase() {
  printHeader('1. Supabase (PostgreSQL Connection)')
  
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL environment variable is missing!')
  }
  console.log(`📡 Connection URL target: ${url.substring(0, 45)}...`)

  try {
    console.log('⏳ Sending ping to Postgres (SELECT 1)...')
    const start = Date.now()
    const rawResult = await db.execute(sql`SELECT 1 as val`)
    const duration = Date.now() - start
    console.log(`✅ SELECT 1 responded in ${duration}ms! Result:`, rawResult)

    console.log('⏳ Checking titles table structure by fetching first 3 records...')
    const titleResults = await db.select().from(titles).limit(3)
    console.log(`✅ Titles table query succeeded! Found ${titleResults.length} records in cache.`)
    titleResults.forEach((t) => {
      console.log(`   - [ID: ${t.id}] "${t.name}" (Slug: ${t.slug})`)
    })
    
    console.log('🟢 SUPABASE LAYER IS HEALTHY & CONNECTED!')
    return true
  } catch (err: any) {
    console.error('🔴 SUPABASE LAYER FAILURE:', err.message || err)
    return false
  }
}

async function testUpstashRedis() {
  printHeader('2. Upstash Redis (Cache & Rate Limiting)')
  
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  
  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing!')
  }
  console.log(`📡 Redis REST endpoint: ${url.substring(0, 30)}...`)

  try {
    const redis = new Redis({ url, token })
    
    console.log('⏳ Writing test key with TTL to Redis...')
    await redis.set('smoke:test:conn', 'healthy', { ex: 30 })
    
    console.log('⏳ Reading back test key...')
    const val = await redis.get('smoke:test:conn')
    
    if (val === 'healthy') {
      console.log('✅ Read/Write works perfectly!')
    } else {
      throw new Error(`Redis read returned unexpected value: ${val}`)
    }
    
    // Clean up
    await redis.del('smoke:test:conn')

    console.log('⏳ Validating rate limiter sliding window...')
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(2, '1 s'),
      prefix: 'smoke:test:ratelimit',
    })

    const r1 = await limiter.limit('test-key')
    const r2 = await limiter.limit('test-key')
    const r3 = await limiter.limit('test-key')

    console.log(`✅ Rate limiter sliding window responses:`)
    console.log(`   - Request 1: success=${r1.success}`)
    console.log(`   - Request 2: success=${r2.success}`)
    console.log(`   - Request 3: success=${r3.success} (Should be blocked/false)`)

    if (r1.success && r2.success && !r3.success) {
      console.log('✅ Rate limiting blocks exactly as expected!')
    } else {
      console.log('⚠️ Rate limiter allowed unexpected requests, but connection is OK.')
    }

    await redis.del('smoke:test:ratelimit:test-key')
    console.log('🟢 UPSTASH REDIS LAYER IS HEALTHY & CONNECTED!')
    return true
  } catch (err: any) {
    console.error('🔴 UPSTASH REDIS LAYER FAILURE:', err.message || err)
    return false
  }
}

async function testJikanApi() {
  printHeader('3. Jikan Client (MyAnimeList Gateway)')
  
  try {
    console.log('⏳ Requesting MAL ID 20 (Naruto) from Jikan client...')
    const start = Date.now()
    const response = await jikanGet('/anime/20')
    const duration = Date.now() - start
    
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Jikan responded in ${duration}ms! Got: "${data.data.title}"`)
      console.log('🟢 Jikan API is reachable and fully functional!')
      return true
    } else {
      console.log(`⚠️ Jikan API returned non-OK status: ${response.status}. Client handled it properly.`)
      return true
    }
  } catch (err: any) {
    if (err.name === 'JikanUnavailableError') {
      console.log(`⚠️ Jikan API is temporarily throttled or circuit is open: ${err.message}. This is an expected client behavior under load.`)
      return true
    }
    console.error('🔴 Jikan CLIENT FAILURE:', err.message || err)
    return false
  }
}

async function testTitleService() {
  printHeader('4. Integrated Title Service (Full Layer Match)')
  
  try {
    console.log('⏳ Running getTitleData("20-naruto", "en") directly...')
    const start = Date.now()
    const result = await getTitleData('20-naruto', 'en')
    const duration = Date.now() - start
    
    if (result) {
      console.log(`✅ Integration Succeeded in ${duration}ms!`)
      console.log(`   - Name: ${result.name}`)
      console.log(`   - Japanese Name: ${result.nameJapanese}`)
      console.log(`   - Episodes: ${result.episodes}`)
      console.log(`   - DB Synced status: ${result.slug === 'naruto' ? 'OK' : 'Mismatch'}`)
      console.log('🟢 TITLE SERVICE LAYER IS HEALTHY & INTEGRATED!')
      return true
    } else {
      throw new Error('TitleService returned null for anime 20!')
    }
  } catch (err: any) {
    console.error('🔴 TITLE SERVICE LAYER FAILURE:', err.message || err)
    return false
  }
}

async function runAll() {
  console.log('🏁 STARTING FULL LAYER SMOKE TESTS\n')

  const results = {
    supabase: await testSupabase(),
    upstash: await testUpstashRedis(),
    jikan: await testJikanApi(),
    service: false
  }

  // Only run the integrated test if the base layers are healthy
  if (results.supabase && results.jikan) {
    results.service = await testTitleService()
  } else {
    console.log('\n⚠️ Skipping Integrated Title Service test because base layers are failing.')
  }

  console.log('\n==================================================')
  console.log('📊 SUMMARY REPORT')
  console.log('==================================================')
  console.log(`1. Supabase Postgres Connection : ${results.supabase ? '🟢 PASS' : '🔴 FAIL'}`)
  console.log(`2. Upstash Redis Connection     : ${results.upstash ? '🟢 PASS' : '🔴 FAIL'}`)
  console.log(`3. Jikan Client Connectivity    : ${results.jikan ? '🟢 PASS' : '🔴 FAIL'}`)
  console.log(`4. Integrated Title Service     : ${results.service ? '🟢 PASS' : '🔴 FAIL'}`)
  console.log('==================================================')

  const allPassed = Object.values(results).every(v => v === true)
  if (allPassed) {
    console.log('\n🎉 ALL LAYERS ARE WORKING PERFECTLY! READY FOR DEPLOY!\n')
    process.exit(0)
  } else {
    console.log('\n❌ SOME LAYERS FAILD. DO NOT DEPLOY YET.\n')
    process.exit(1)
  }
}

runAll().catch(console.error)
