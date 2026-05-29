/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ─── Mocks ───────────────────────────────────────────────
const mockLimit = jest.fn().mockResolvedValue({ success: true })
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    onConflictDoUpdate: jest.fn().mockResolvedValue([]),
  },
}))

let isSuccess = true

jest.mock('@/lib/ratelimit', () => ({
  titleRateLimit: {
    limit: jest.fn().mockImplementation(() => Promise.resolve({ success: isSuccess }))
  }
}))

const __setLimitSuccess = (val: boolean) => {
  isSuccess = val
}

// Force env vars
process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:8080'
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'

jest.mock('@/lib/jikan-client', () => ({
  jikanGet: jest.fn(),
  JikanUnavailableError: class JikanUnavailableError extends Error {
    constructor(msg = 'Jikan API is temporarily unavailable') {
      super(msg)
      this.name = 'JikanUnavailableError'
    }
  }
}))

import { GET } from './route'
import { db } from '@/lib/db'
import { jikanGet, JikanUnavailableError } from '@/lib/jikan-client'

const mockJikanGet = jikanGet as jest.Mock

describe('GET /api/title/[slug]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __setLimitSuccess(true)
  })

  // 1. Zod Validation
  it('should return 400 for invalid slug format', async () => {
    const request = new NextRequest('http://localhost:3000/api/title/in!valid')
    const response = await GET(request, { params: Promise.resolve({ slug: 'in!valid' }) })
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid slug format')
  })

  // 2. Rate Limiting
  it('should return 429 when rate limit is exceeded', async () => {
    __setLimitSuccess(false)

    const request = new NextRequest('http://localhost:3000/api/title/naruto')
    const response = await GET(request, { params: Promise.resolve({ slug: 'naruto' }) })
    expect(response.status).toBe(429)

    __setLimitSuccess(true) // reset
  })

  // 3. DB Caching & Jikan Fallback
  it('should return title details from DB if fresh', async () => {
    ;(db as any).limit.mockResolvedValueOnce([{
      id: 20,
      slug: 'naruto',
      name: 'Naruto',
      image: 'https://cdn.myanimelist.net/naruto.jpg',
      synopsis: 'Naruto is a young ninja...',
      type: 'anime',
      status: 'finished',
      episodes: 220,
      score: '8.01',
      source: 'Manga',
      updatedAt: new Date() // fresh
    }])

    const request = new NextRequest('http://localhost:3000/api/title/naruto')
    const response = await GET(request, { params: Promise.resolve({ slug: 'naruto' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.title.id).toBe(20)
    expect(data.title.episodes).toBe(220)
    expect(mockJikanGet).not.toHaveBeenCalled()
  })

  it('should fetch from Jikan, save to DB, and return details if DB is empty', async () => {
    ;(db as any).limit.mockResolvedValueOnce([]) // Empty DB

    // When hitting Jikan by slug, we actually search by exact name and get the first result
    mockJikanGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{
          mal_id: 20,
          title: 'Naruto',
          images: { jpg: { image_url: 'https://cdn.myanimelist.net/naruto.jpg' } },
          synopsis: 'Naruto is a young ninja...',
          type: 'TV',
          status: 'Finished Airing',
          episodes: 220,
          score: 8.01,
          source: 'Manga',
        }]
      }),
    })

    const request = new NextRequest('http://localhost:3000/api/title/naruto')
    const response = await GET(request, { params: Promise.resolve({ slug: 'naruto' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.title.id).toBe(20)
    expect(mockJikanGet).toHaveBeenCalledTimes(1)
    expect(db.insert).toHaveBeenCalled() // Saved to cache
  })

  it('should return 404 when title is not found in DB or Jikan', async () => {
    ;(db as any).limit.mockResolvedValueOnce([])
    mockJikanGet.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    })

    const request = new NextRequest('http://localhost:3000/api/title/non-existent')
    const response = await GET(request, { params: Promise.resolve({ slug: 'non-existent' }) })
    expect(response.status).toBe(404)
  })

  it('should return 500 when Jikan API fails', async () => {
    ;(db as any).limit.mockResolvedValueOnce([])
    mockJikanGet.mockRejectedValueOnce(new JikanUnavailableError('Jikan API fails'))

    const request = new NextRequest('http://localhost:3000/api/title/naruto')
    const response = await GET(request, { params: Promise.resolve({ slug: 'naruto' }) })

    expect(response.status).toBe(500)
  })
})
