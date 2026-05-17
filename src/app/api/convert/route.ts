import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mappings, titles } from '@/db/schema'
import { eq, sql, and } from 'drizzle-orm'
import { z } from 'zod'
import { convertRateLimit } from '@/lib/ratelimit'

// Zod Schema
const convertSchema = z.object({
  type: z.enum(['ep', 'cap']),
  value: z.coerce.number().positive(),
  title_id: z.coerce.number().int().positive(),
})

/**
 * Maps Jikan source strings to our source_type enum values.
 */
function mapJikanSourceToEnum(source: string | null | undefined): string {
  if (!source) return 'unknown'
  const s = source.toLowerCase()
  if (s.includes('4-koma') || s.includes('web manga')) return 'manga'
  if (s.includes('light novel')) return 'light_novel'
  if (s.includes('web novel')) return 'web_novel'
  if (s.includes('visual novel')) return 'visual_novel'
  if (s.includes('novel')) return 'novel'
  if (s.includes('manga')) return 'manga'
  if (s.includes('game')) return 'game'
  if (s.includes('original')) return 'original'
  if (s.includes('other')) return 'other'
  return 'unknown'
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const rawParams = {
    type: searchParams.get('type'),
    value: searchParams.get('value'),
    title_id: searchParams.get('title_id'),
  }

  const parsed = convertSchema.safeParse(rawParams)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { type, value: numericValue, title_id: numericTitleId } = parsed.data

  // Rate Limiting
  if (convertRateLimit) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { success } = await convertRateLimit.limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  try {

    // Build query based on conversion direction
    const fieldToMatch = type === 'ep' ? mappings.episode : mappings.chapter

    const result = await db
      .select({
        episode: mappings.episode,
        chapter: mappings.chapter,
        isFiller: mappings.isFiller,
        isCanon: mappings.isCanon,
        sourceType: mappings.sourceType,
        titleSource: titles.source,
      })
      .from(mappings)
      .innerJoin(titles, eq(mappings.titleId, titles.id))
      .where(and(eq(mappings.titleId, numericTitleId), eq(fieldToMatch, numericValue.toString())))
      // Priority: manga > light_novel > original
      .orderBy(
        sql`CASE WHEN ${mappings.sourceType} = 'manga' THEN 1 WHEN ${mappings.sourceType} = 'light_novel' THEN 2 ELSE 3 END`
      )
      .limit(1)

    if (result.length === 0) {
      // Check if the input exceeded the max available
      const maxResult = await db.select({
        maxVal: fieldToMatch
      })
      .from(mappings)
      .where(eq(mappings.titleId, numericTitleId))
      .orderBy(sql`CAST(${fieldToMatch} AS NUMERIC) DESC`)
      .limit(1)

      let errorCode = 'Not found'
      let maxAvailable = null

      if (maxResult.length > 0 && maxResult[0].maxVal) {
        maxAvailable = Number(maxResult[0].maxVal)
        if (numericValue > maxAvailable) {
          errorCode = 'ExceededMax'
        }
      }

      return NextResponse.json({ error: errorCode, maxAvailable }, { status: 404 })
    }

    const mapping = result[0]
    // Derive sourceType from titles.source (single source of truth) instead of mappings.source_type
    const derivedSourceType = mapJikanSourceToEnum(mapping.titleSource)

    const converted =
      type === 'ep'
        ? {
            type: 'cap',
            value: mapping.chapter,
            isFiller: mapping.isFiller,
            isCanon: mapping.isCanon,
            sourceType: derivedSourceType,
          }
        : {
            type: 'ep',
            value: mapping.episode,
            isFiller: mapping.isFiller,
            isCanon: mapping.isCanon,
            sourceType: derivedSourceType,
          }

    return NextResponse.json({ converted })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to convert' }, { status: 500 })
  }
}
