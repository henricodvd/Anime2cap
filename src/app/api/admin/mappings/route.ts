import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { mappings } from '@/db/schema'
import { z } from 'zod'
import { adminRateLimit } from '@/lib/ratelimit'

// Zod Schema for each mapping item
const mappingItemSchema = z.object({
  titleId: z.number().int().positive(),
  episode: z.number().positive(),
  chapter: z.number().positive().nullable(),
  isFiller: z.boolean().optional().default(false),
  isCanon: z.boolean().optional().default(true),
  sourceType: z.enum(['manga', 'light_novel', 'original']).optional().default('manga'),
})

const mappingsBodySchema = z.object({
  mappings: z.array(mappingItemSchema).min(1, 'At least one mapping is required'),
})

export async function POST(request: NextRequest) {
  // ─── Auth ──────────────────────────────────────────────
  const apiKey = request.headers.get('x-api-key')
  const expectedKey = process.env.ADMIN_API_KEY

  if (!apiKey || apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── Rate Limiting ─────────────────────────────────────
  if (adminRateLimit) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1'
    const { success } = await adminRateLimit.limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
  }

  // ─── Validation ────────────────────────────────────────
  try {
    const body = await request.json()
    const parsed = mappingsBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'mappings array is required and must not be empty' },
        { status: 400 }
      )
    }

    const items = parsed.data.mappings

    
    // ─── Bulk insert ───────────────────────────────────────
    await db.insert(mappings).values(items)

    return NextResponse.json({ inserted: items.length })
  } catch (error) {
    console.error('[ADMIN MAPPINGS ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to insert mappings' },
      { status: 500 }
    )
  }
}
