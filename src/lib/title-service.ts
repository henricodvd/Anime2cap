import { db } from '@/lib/db'
import { titles } from '@/db/schema'
import slugify from 'slugify'
import { eq, sql } from 'drizzle-orm'
import { jikanGet, JikanUnavailableError } from '@/lib/jikan-client'
import { translateText } from '@/lib/translate'
import * as Sentry from '@sentry/nextjs'

const SHOULD_TRANSLATE = false
const translationCache = new Map<string, string>()

export interface TitleResult {
  id: number
  slug: string
  name: string
  nameJapanese: string | null
  image: string | null
  synopsis: string | null
  type: string | null
  status: 'ongoing' | 'finished' | 'upcoming' | null
  episodes: number | null
  score: string | null
  source: string | null
  updatedAt: Date
}

function mapJikanType(type: string): string {
  const t = type?.toLowerCase() || ''
  if (t === 'tv' || t === 'tv_special') return 'anime'
  if (t === 'movie') return 'movie'
  if (t === 'ova') return 'ova'
  if (t === 'special') return 'special'
  if (t === 'ona') return 'ona'
  if (t === 'music') return 'music'
  return 'anime'
}

function mapJikanStatus(jikanStatus: string): 'ongoing' | 'finished' | 'upcoming' {
  if (jikanStatus?.includes('Airing') && !jikanStatus?.includes('Finished')) {
    return 'ongoing'
  }
  if (jikanStatus?.includes('Finished')) {
    return 'finished'
  }
  if (jikanStatus?.includes('Not yet aired')) {
    return 'upcoming'
  }
  return 'ongoing'
}

/**
 * Service function to retrieve title details directly from local DB or Jikan fallback.
 * Can be called by Server Components directly (bypassing fetch HTTP) or inside API Routes.
 */
export async function getTitleData(slug: string, locale: string = 'en'): Promise<TitleResult | null> {
  // Handle "ID-slug" or just "ID" format for precision
  let lookupId: number | null = null
  let lookupSlug = slug

  if (/^\d+$/.test(slug)) {
    lookupId = parseInt(slug)
  } else if (/^\d+-/.test(slug)) {
    const parts = slug.split('-')
    lookupId = parseInt(parts[0])
    lookupSlug = parts.slice(1).join('-')
  }

  // 1. DB Caching Check (Check local Postgres first)
  const dbResults = await db
    .select()
    .from(titles)
    .where(lookupId ? eq(titles.id, lookupId) : eq(titles.slug, lookupSlug))
    .limit(1)

  const titleRecord = dbResults[0]
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // If we have the full record (synopsis exists) and it's fresh
  if (titleRecord && titleRecord.synopsis && titleRecord.updatedAt && titleRecord.updatedAt > sevenDaysAgo) {
    return titleRecord as TitleResult
  }

  // 2. Jikan Fallback — via centralized client with throttle + circuit breaker
  let anime = null
  let jikanAvailable = true
  const effectiveId = lookupId || (titleRecord?.id)

  try {
    if (effectiveId) {
      // Direct lookup by MAL ID - absolute precision
      const response = await jikanGet(`/anime/${effectiveId}`)
      if (response.ok) {
        const data = await response.json()
        anime = data.data
      }
    } else {
      // Search by name query using the slug - only as a last resort
      const query = lookupSlug.replace(/-/g, ' ')
      const response = await jikanGet(`/anime?q=${encodeURIComponent(query)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        const jikanResults = data.data || []
        
        // Priority 1: Exact slug match
        anime = jikanResults.find((a: any) => slugify(a.title, { lower: true, strict: true }) === lookupSlug)
        
        // Priority 2: Fallback to first result if no exact slug match
        if (!anime) anime = jikanResults[0]
      }
    }
  } catch (err) {
    jikanAvailable = false
    if (!(err instanceof JikanUnavailableError)) {
      Sentry.captureException(err)
    }
    // If Jikan fails and we have stale DB data, fall through to return it
    if (!titleRecord) {
      throw err
    }
  }

  // 3. Stale data fallback — serve old DB data when Jikan is down
  if (!anime && !jikanAvailable && titleRecord) {
    return titleRecord as TitleResult
  }
  
  if (!anime) {
    return null
  }

  const generatedSlug = slugify(anime.title, { lower: true, strict: true })
  
  const result: TitleResult = {
    id: anime.mal_id,
    slug: generatedSlug,
    name: anime.title,
    nameJapanese: anime.title_japanese || null,
    image: anime.images?.jpg?.image_url || null,
    synopsis: anime.synopsis || null,
    type: mapJikanType(anime.type),
    status: mapJikanStatus(anime.status),
    episodes: anime.episodes || null,
    score: anime.score?.toString() || null,
    source: anime.source || null,
    updatedAt: new Date(),
  }

  // 4. Sync cache back to DB asynchronously
  try {
    await db
      .insert(titles)
      .values({
        id: result.id,
        name: result.name,
        nameJapanese: result.nameJapanese,
        slug: result.slug,
        type: result.type as any,
        image: result.image,
        status: result.status as any,
        synopsis: result.synopsis,
        episodes: result.episodes,
        score: result.score,
        source: result.source,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: titles.id,
        set: {
          name: sql`EXCLUDED.name`,
          nameJapanese: sql`EXCLUDED.name_japanese`,
          slug: sql`EXCLUDED.slug`,
          type: sql`EXCLUDED.type`,
          image: sql`EXCLUDED.image`,
          status: sql`EXCLUDED.status`,
          synopsis: sql`EXCLUDED.synopsis`,
          episodes: sql`EXCLUDED.episodes`,
          score: sql`EXCLUDED.score`,
          source: sql`EXCLUDED.source`,
          updatedAt: new Date(),
        },
      })
  } catch (dbErr) {
    console.warn('[TitleService] Failed to sync title to local DB:', dbErr)
  }

  // 5. Translation logic
  if (SHOULD_TRANSLATE && locale && locale !== 'en' && result.synopsis) {
    const cacheKey = `${result.id}-${locale}`
    if (translationCache.has(cacheKey)) {
      result.synopsis = translationCache.get(cacheKey)!
    } else {
      try {
        const translated = await translateText(result.synopsis, locale)
        translationCache.set(cacheKey, translated)
        result.synopsis = translated
      } catch (transErr) {
        console.error('[TitleService] Translation failed:', transErr)
      }
    }
  }

  return result
}
