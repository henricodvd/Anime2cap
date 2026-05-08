import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { titles } from '@/db/schema'
import { z } from 'zod'
import slugify from 'slugify'
import { ilike, sql } from 'drizzle-orm'
import { searchRateLimit } from '@/lib/ratelimit'

const JIKAN_API_URL = process.env.JIKAN_API_URL || 'https://api.jikan.moe/v4'

// 1. Zod Schema
const searchSchema = z.string()
  .min(2, "Query too short")
  .max(100, "Query too long")
  .regex(/^[a-zA-Z0-9\s-_:]+$/, "Invalid characters in query")

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
    // 3. DB Caching Check (Check local Postgres first)
    const dbResults = await db
      .select()
      .from(titles)
      .where(ilike(titles.name, `%${query}%`))
      .orderBy(sql`${titles.updatedAt} DESC`)
      .limit(10)

    // If we have results and they are fresh (e.g., < 7 days old)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const freshResults = dbResults.filter(r => r.updatedAt && r.updatedAt > sevenDaysAgo)
    
    if (freshResults.length > 0) {
      // Safeguard: Re-map types if they are generically 'anime' but name implies otherwise
      // This fixes stale data in the DB cache without needing a full re-fetch
      const correctedResults = freshResults.map(r => {
        if (r.type === 'anime') {
          const name = r.name.toLowerCase()
          if (name.includes('movie') || name.includes('film')) return { ...r, type: 'movie' }
          if (name.includes('ova')) return { ...r, type: 'ova' }
          if (name.includes('ona')) return { ...r, type: 'ona' }
          if (name.includes('special')) return { ...r, type: 'special' }
        }
        return r
      })

      // Deduplicate by ID
      const uniqueDbResults = correctedResults.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
      
      return NextResponse.json({ results: uniqueDbResults })
    }

    // 4. Jikan Fallback
    const response = await fetch(
      `${JIKAN_API_URL}/anime?q=${encodeURIComponent(query)}&limit=10`
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

    // Deduplicate results by ID before returning
    const uniqueResults = results.filter((v: any, i: number, a: any[]) => a.findIndex(t => t.id === v.id) === i)

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
