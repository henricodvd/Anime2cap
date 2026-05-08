import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mappings } from '@/db/schema'
import { eq, sql, and } from 'drizzle-orm'
import { z } from 'zod'
import { convertRateLimit } from '@/lib/ratelimit'

// Zod Schema
const convertSchema = z.object({
  type: z.enum(['ep', 'cap']),
  value: z.coerce.number().positive(),
  title_id: z.coerce.number().int().positive(),
})

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
      .select()
      .from(mappings)
      .where(and(eq(mappings.titleId, numericTitleId), eq(fieldToMatch, numericValue.toString())))
      // Priority: manga > light_novel > original
      .orderBy(
        sql`CASE WHEN ${mappings.sourceType} = 'manga' THEN 1 WHEN ${mappings.sourceType} = 'light_novel' THEN 2 ELSE 3 END`
      )
      .limit(1)

    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const mapping = result[0]
    const converted =
      type === 'ep'
        ? {
            type: 'cap',
            value: mapping.chapter,
            isFiller: mapping.isFiller,
            isCanon: mapping.isCanon,
            sourceType: mapping.sourceType,
          }
        : {
            type: 'ep',
            value: mapping.episode,
            isFiller: mapping.isFiller,
            isCanon: mapping.isCanon,
            sourceType: mapping.sourceType,
          }

    return NextResponse.json({ converted })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to convert' }, { status: 500 })
  }
}
