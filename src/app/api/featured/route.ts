import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { titles } from '@/db/schema'
import { desc, isNotNull } from 'drizzle-orm'
import { jikanGet } from '@/lib/jikan-client'
import slugify from 'slugify'
import { sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // 1. Check if we have fresh featured data in DB
    const existing = await db
      .select()
      .from(titles)
      .where(isNotNull(titles.topRank))
      .orderBy(titles.topRank)
      .limit(20)

    // 2. If we have data less than 24h old, return it
    if (existing.length > 0) {
      const newestFeatured = existing.reduce((latest, t) => {
        return !latest || (t.featuredUpdatedAt && t.featuredUpdatedAt > latest.featuredUpdatedAt!) ? t : latest
      }, null as typeof existing[0] | null)

      if (newestFeatured?.featuredUpdatedAt) {
        const hoursSinceUpdate = (Date.now() - new Date(newestFeatured.featuredUpdatedAt).getTime()) / (1000 * 60 * 60)
        if (hoursSinceUpdate < 24) {
          return NextResponse.json({ featured: existing })
        }
      }
    }

    // 3. Fetch fresh top anime from Jikan (top/anime + seasonal for variety)
    const featuredData: any[] = []

    try {
      // Fetch top anime (all time + seasonal for "do momento" feel)
      const [topRes, seasonalRes] = await Promise.all([
        jikanGet('/top/anime?limit=10'),
        jikanGet('/seasons/now?limit=10'),
      ])

      const topData = topRes.ok ? (await topRes.json()).data || [] : []
      const seasonalData = seasonalRes.ok ? (await seasonalRes.json()).data || [] : []

      // Merge: seasonal first (these are "do momento"), then top
      const seen = new Set<number>()
      const merged = [...seasonalData, ...topData]
      for (const anime of merged) {
        if (!seen.has(anime.mal_id) && featuredData.length < 10) {
          seen.add(anime.mal_id)
          featuredData.push(anime)
        }
      }
    } catch {
      // If Jikan fails, return whatever we have in DB (even if stale)
      if (existing.length > 0) {
        return NextResponse.json({ featured: existing })
      }
      return NextResponse.json({ featured: [] })
    }

    // 4. Upsert featured data to DB
    for (let i = 0; i < featuredData.length; i++) {
      const anime = featuredData[i]
      const generatedSlug = slugify(anime.title, { lower: true, strict: true })

      await db
        .insert(titles)
        .values({
          id: anime.mal_id,
          name: anime.title,
          slug: generatedSlug,
          type: mapJikanType(anime.type) as any,
          image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || null,
          status: mapJikanStatus(anime.status) as any,
          synopsis: anime.synopsis || null,
          episodes: anime.episodes || null,
          score: anime.score?.toString() || null,
          source: anime.source || null,
          topRank: i + 1,
          featuredUpdatedAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: titles.id,
          set: {
            name: sql`EXCLUDED.name`,
            slug: sql`EXCLUDED.slug`,
            type: sql`EXCLUDED.type`,
            image: sql`EXCLUDED.image`,
            status: sql`EXCLUDED.status`,
            synopsis: sql`EXCLUDED.synopsis`,
            episodes: sql`EXCLUDED.episodes`,
            score: sql`EXCLUDED.score`,
            source: sql`EXCLUDED.source`,
            topRank: sql`EXCLUDED.top_rank`,
            featuredUpdatedAt: sql`EXCLUDED.featured_updated_at`,
            updatedAt: sql`EXCLUDED.updated_at`,
          },
        })
    }

    // 5. Return fresh data
    const fresh = await db
      .select()
      .from(titles)
      .where(isNotNull(titles.topRank))
      .orderBy(titles.topRank)
      .limit(20)

    return NextResponse.json({ featured: fresh })
  } catch (error) {
    console.error('[API featured] Error:', error)
    return NextResponse.json({ featured: [] })
  }
}

function mapJikanType(type: string): string {
  const t = type?.toLowerCase() || ''
  return ['tv', 'movie', 'ova', 'ona', 'special', 'music'].includes(t) ? t === 'tv' ? 'anime' : t : 'anime'
}

function mapJikanStatus(status: string): string {
  if (status?.includes('Airing')) return 'ongoing'
  if (status?.includes('Finished')) return 'finished'
  if (status?.includes('Not yet')) return 'upcoming'
  return 'ongoing'
}
