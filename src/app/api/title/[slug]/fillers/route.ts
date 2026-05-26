import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { db } from '@/lib/db'
import { mappings } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const idSchema = z.coerce.number().int().positive()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const parsed = idSchema.safeParse(slug)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid title ID' }, { status: 400 })
  }

  const titleId = parsed.data

  try {
    const fillers = await db
      .select()
      .from(mappings)
      .where(and(eq(mappings.titleId, titleId), eq(mappings.isFiller, true)))
      .orderBy(mappings.episode)

    return NextResponse.json({ fillers })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
