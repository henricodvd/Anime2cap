import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { titles, mappings } from '@/db/schema'
import { z } from 'zod'
import slugify from 'slugify'
import { ilike, sql, eq, inArray } from 'drizzle-orm'
import { searchRateLimit } from '@/lib/ratelimit'

const JIKAN_API_URL = process.env.JIKAN_API_URL || 'https://api.jikan.moe/v4'

// Expanded regex: allow common anime title characters (., !, ', (), ×, ☆, etc.)
const searchSchema = z.string()
  .min(2, "Query too short")
  .max(100, "Query too long")
  .regex(/^[a-zA-Z0-9\s\-_:.!'()+×☆&,]+$/, "Invalid characters in query")

// Type priority for sorting: lower = higher priority
const TYPE_PRIORITY: Record<string, number> = {
  anime: 1,
  ona: 2,
  movie: 3,
  ova: 4,
  special: 5,
  music: 6,
  manga: 7,
  manhwa: 8,
  donghua: 9,
  light_novel: 10,
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const rawQuery = searchParams.get('q')

  // Validation
  if (!rawQuery) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const parsedQuery = searchSchema.safeParse(rawQuery)
  if (!parsedQuery.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const query = parsedQuery.data

  // Rate Limiting
  if (searchRateLimit) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { success } = await searchRateLimit.limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  try {
    // 3. DB Search — use pg_trgm similarity for fuzzy search + ILIKE fallback
    const dbResults = await db
      .select()
      .from(titles)
      .where(
        sql`(${titles.name} ILIKE ${'%' + query + '%'} OR similarity(${titles.name}, ${query}) > 0.15)`
      )
      .orderBy(
        sql`similarity(${titles.name}, ${query}) DESC`
      )
      .limit(20)

    // Check freshness
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const freshResults = dbResults.filter(r => r.updatedAt && r.updatedAt > sevenDaysAgo)
    
    // Get IDs that have mappings for the "has data" badge
    const titleIds = dbResults.map(r => r.id)
    let mappingTitleIds = new Set<number>()
    
    if (titleIds.length > 0) {
      const mappingResults = await db
        .select({ titleId: mappings.titleId })
        .from(mappings)
        .where(inArray(mappings.titleId, titleIds))
        .groupBy(mappings.titleId)
      
      mappingTitleIds = new Set(mappingResults.map(r => r.titleId))
    }

    if (freshResults.length >= 3) {
      // Enough fresh results — return sorted by type priority + hasMappings
      const enrichedResults = freshResults.map(r => ({
        ...r,
        hasMappings: mappingTitleIds.has(r.id),
      }))

      // Sort: hasMappings first, then by type priority
      enrichedResults.sort((a, b) => {
        if (a.hasMappings !== b.hasMappings) return a.hasMappings ? -1 : 1
        return (TYPE_PRIORITY[a.type] ?? 99) - (TYPE_PRIORITY[b.type] ?? 99)
      })

      // Deduplicate by ID
      const uniqueDbResults = enrichedResults.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
      
      return NextResponse.json({ results: uniqueDbResults.slice(0, 20) })
    }

    // 4. Jikan Fallback — not enough fresh local results
    const response = await fetch(
      `${JIKAN_API_URL}/anime?q=${encodeURIComponent(query)}&limit=15`
    )

    if (!response.ok) {
      throw new Error('Jikan API error')
    }

    const data = await response.json()

    const results = data.data.map((anime: any) => ({
      id: anime.mal_id,
      name: anime.title,
      nameJapanese: anime.title_japanese,
      slug: slugify(anime.title, { lower: true, strict: true }),
      image: anime.images?.jpg?.image_url,
      type: mapJikanType(anime.type),
      status: mapJikanStatus(anime.status),
    }))

    // Upsert to cache
    if (results.length > 0) {
      try {
        await db
          .insert(titles)
          .values(results.map((r: any) => ({
            id: r.id,
            name: r.name,
            nameJapanese: r.nameJapanese,
            slug: r.slug,
            type: r.type as any,
            image: r.image,
            status: r.status as any,
            updatedAt: new Date(),
          })))
          .onConflictDoUpdate({
            target: titles.id,
            set: {
              name: sql`EXCLUDED.name`,
              nameJapanese: sql`EXCLUDED.name_japanese`,
              slug: sql`EXCLUDED.slug`,
              type: sql`EXCLUDED.type`,
              image: sql`EXCLUDED.image`,
              status: sql`EXCLUDED.status`,
              updatedAt: new Date(),
            },
          })
      } catch {
        // DB sync failure shouldn't block the request
        console.warn('Failed to sync titles to local DB')
      }
    }

    // Merge Jikan results with mapping data
    const jikanIds = results.map((r: any) => r.id)
    let jikanMappingIds = new Set<number>()
    if (jikanIds.length > 0) {
      try {
        const jikanMappings = await db
          .select({ titleId: mappings.titleId })
          .from(mappings)
          .where(inArray(mappings.titleId, jikanIds))
          .groupBy(mappings.titleId)
        jikanMappingIds = new Set(jikanMappings.map((r: any) => r.titleId))
      } catch {
        // Non-critical
      }
    }

    const enrichedJikanResults = results.map((r: any) => ({
      ...r,
      hasMappings: jikanMappingIds.has(r.id),
    }))

    // Sort: hasMappings first, then by type priority
    enrichedJikanResults.sort((a: any, b: any) => {
      if (a.hasMappings !== b.hasMappings) return a.hasMappings ? -1 : 1
      return (TYPE_PRIORITY[a.type] ?? 99) - (TYPE_PRIORITY[b.type] ?? 99)
    })

    // Deduplicate results by ID before returning
    const uniqueResults = enrichedJikanResults.filter((v: any, i: number, a: any[]) => a.findIndex(t => t.id === v.id) === i)

    return NextResponse.json({ results: uniqueResults })
  } catch (error) {
    console.error('[SEARCH ERROR]', error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      { error: 'Failed to fetch data' },
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
