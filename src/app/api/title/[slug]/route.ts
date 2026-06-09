import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { db } from '@/lib/db'
import { titles } from '@/db/schema'
import { z } from 'zod'
import slugify from 'slugify'
import { eq, sql } from 'drizzle-orm'
import { titleRateLimit } from '@/lib/ratelimit'
import { jikanGet, JikanUnavailableError } from '@/lib/jikan-client'

import { translateText } from '@/lib/translate'

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
    const { getTitleData } = await import('@/lib/title-service')
    const title = await getTitleData(slug, locale)

    if (!title) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ title })
  } catch (error) {
    console.error(`[API title] Error fetching title for slug "${slug}":`, error)
    if (!(error instanceof JikanUnavailableError)) {
      Sentry.captureException(error)
    }
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
