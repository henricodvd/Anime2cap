import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { db } from '@/lib/db'
import { titles } from '@/db/schema'
import { z } from 'zod'
import slugify from 'slugify'
import { eq, sql } from 'drizzle-orm'
import { titleRateLimit } from '@/lib/ratelimit'

import { translateText } from '@/lib/translate'

const JIKAN_API_URL = process.env.JIKAN_API_URL || 'https://api.jikan.moe/v4'

// Feature flag for translation (set to false to save costs)
const SHOULD_TRANSLATE = false

// Simple in-memory cache for translations to avoid redundant AI calls
const translationCache = new Map<string, string>()

// 1. Zod Schema
const slugSchema = z.string()
  .min(2, "Invalid slug format")
  .max(500, "Invalid slug format")
  .regex(/^[a-zA-Z0-9-]+$/, "Invalid slug format")

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await params
  const searchParams = request.nextUrl.searchParams
  const locale = searchParams.get('locale') || 'en'

  const parsedSlug = slugSchema.safeParse(rawSlug)
  if (!parsedSlug.success) {
    return NextResponse.json({ error: 'Invalid slug format' }, { status: 400 })
  }

  const slug = parsedSlug.data
  
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

  const isNumericId = lookupId !== null

  // Rate Limiting
  if (titleRateLimit) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { success } = await titleRateLimit.limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  try {
    // 3. DB Caching Check (Check local Postgres first)
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
      return NextResponse.json({ title: titleRecord })
    }

    // 4. Jikan Fallback
    let anime = null
    
    // If we have a lookupId from the URL or a record in the DB (even if stale/incomplete)
    // always use the ID for the Jikan lookup to avoid fuzzy search collisions
    const effectiveId = lookupId || (titleRecord?.id)

    if (effectiveId) {
      // Direct lookup by MAL ID - absolute precision
      const response = await fetch(`${JIKAN_API_URL}/anime/${effectiveId}`)
      if (response.ok) {
        const data = await response.json()
        anime = data.data
      } else if (response.status !== 404) {
        throw new Error(`Jikan API error: ${response.status}`)
      }
    } else {
      // Search by name query using the slug - only as a last resort
      const query = lookupSlug.replace(/-/g, ' ')
      const response = await fetch(`${JIKAN_API_URL}/anime?q=${encodeURIComponent(query)}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        const jikanResults = data.data || []
        
        // Priority 1: Exact slug match
        anime = jikanResults.find((a: any) => slugify(a.title, { lower: true, strict: true }) === lookupSlug)
        
        // Priority 2: Fallback to first result if no exact slug match
        if (!anime) anime = jikanResults[0]
      } else if (response.status !== 404) {
        throw new Error(`Jikan API error: ${response.status}`)
      }
    }
    
    if (!anime) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const generatedSlug = slugify(anime.title, { lower: true, strict: true })
    
    const result = {
      id: anime.mal_id,
      slug: generatedSlug,
      name: anime.title,
      nameJapanese: anime.title_japanese,
      image: anime.images?.jpg?.image_url,
      synopsis: anime.synopsis,
      type: mapJikanType(anime.type),
      status: mapJikanStatus(anime.status),
      episodes: anime.episodes,
      score: anime.score?.toString(),
      source: anime.source,
      updatedAt: new Date(),
    }

    // Upsert to cache
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
    } catch {
      console.warn('Failed to sync title to local DB')
    }

    // Translation logic
    if (SHOULD_TRANSLATE && locale && locale !== 'en' && result.synopsis) {
      const cacheKey = `${result.id}-${locale}`
      if (translationCache.has(cacheKey)) {
        result.synopsis = translationCache.get(cacheKey)!
      } else {
        const translated = await translateText(result.synopsis, locale)
        translationCache.set(cacheKey, translated)
        result.synopsis = translated
      }
    }

    return NextResponse.json({ title: result })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
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
