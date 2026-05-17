/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ─── Mocks ───────────────────────────────────────────────
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    onConflictDoUpdate: jest.fn().mockResolvedValue([]),
    groupBy: jest.fn().mockResolvedValue([]),
  },
}))

let isSuccess = true

jest.mock('@/lib/ratelimit', () => ({
  searchRateLimit: {
    limit: jest.fn().mockImplementation(() => Promise.resolve({ success: isSuccess }))
  }
}))

const __setLimitSuccess = (val: boolean) => {
  isSuccess = val
}

jest.mock('drizzle-orm', () => ({
  ilike: jest.fn((...args: any[]) => args),
  sql: jest.fn((strings: TemplateStringsArray, ...values: any[]) => ({ strings, values })),
  eq: jest.fn((...args: any[]) => args),
  inArray: jest.fn((...args: any[]) => args),
}))

// Force env vars
process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:8080'
process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token'

const mockFetch = jest.fn()
global.fetch = mockFetch

import { GET } from './route'
import { db } from '@/lib/db'

// ─── Tests ───────────────────────────────────────────────
describe('GET /api/search', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    __setLimitSuccess(true)
  })

  // 1. Zod Validation Tests
  it('should return 400 when query parameter is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/search')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should return 400 when query parameter is too short', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?q=a')
    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('should return 400 when query contains unsafe characters', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?q=naruto<script>')
    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  // 2. Expanded regex — BUG 3 fix
  it('should accept queries with dots and exclamation marks', async () => {
    ;(db.limit as jest.Mock).mockResolvedValueOnce([
      { id: 21, name: 'Dr. Stone', slug: 'dr-stone', image: '...', type: 'anime', status: 'finished', updatedAt: new Date() },
      { id: 22, name: 'Dr. Stone S2', slug: 'dr-stone-2', image: '...', type: 'anime', status: 'finished', updatedAt: new Date() },
      { id: 23, name: 'Dr. Stone S3', slug: 'dr-stone-3', image: '...', type: 'anime', status: 'finished', updatedAt: new Date() },
    ])
    ;(db.groupBy as jest.Mock).mockResolvedValueOnce([{ titleId: 21 }])

    const request = new NextRequest('http://localhost:3000/api/search?q=Dr. Stone!')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })

  it('should accept queries with parentheses and apostrophes', async () => {
    ;(db.limit as jest.Mock).mockResolvedValueOnce([
      { id: 100, name: "JoJo's Bizarre Adventure (2012)", slug: 'jojos-bizarre-adventure', image: '...', type: 'anime', status: 'finished', updatedAt: new Date() },
      { id: 101, name: "JoJo's Bizarre Adventure P2", slug: 'jojos-bizarre-adventure-2', image: '...', type: 'anime', status: 'finished', updatedAt: new Date() },
      { id: 102, name: "JoJo's Bizarre Adventure P3", slug: 'jojos-bizarre-adventure-3', image: '...', type: 'anime', status: 'finished', updatedAt: new Date() },
    ])
    ;(db.groupBy as jest.Mock).mockResolvedValueOnce([])

    const request = new NextRequest("http://localhost:3000/api/search?q=JoJo's (2012)")
    const response = await GET(request)
    expect(response.status).toBe(200)
  })

  // 3. Rate Limiting Tests
  it('should return 429 when rate limit is exceeded', async () => {
    __setLimitSuccess(false)

    const request = new NextRequest('http://localhost:3000/api/search?q=naruto')
    const response = await GET(request)
    expect(response.status).toBe(429)

    __setLimitSuccess(true) // reset
  })

  // 4. Caching & Slug Tests
  it('should return cached DB results if updated within 7 days', async () => {
    ;(db.limit as jest.Mock).mockResolvedValueOnce([
      { id: 20, name: 'Naruto', slug: 'naruto', image: '...', type: 'anime', status: 'finished', updatedAt: new Date() },
      { id: 1735, name: 'Naruto: Shippuuden', slug: 'naruto-shippuuden', image: '...', type: 'anime', status: 'finished', updatedAt: new Date() },
      { id: 442, name: 'Naruto Movie 1', slug: 'naruto-movie-1', image: '...', type: 'movie', status: 'finished', updatedAt: new Date() },
    ])
    ;(db.groupBy as jest.Mock).mockResolvedValueOnce([{ titleId: 20 }, { titleId: 1735 }])

    const request = new NextRequest('http://localhost:3000/api/search?q=naruto')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results.length).toBe(3)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // 5. hasMappings enrichment — BUG 4 fix
  it('should include hasMappings flag in results', async () => {
    ;(db.limit as jest.Mock).mockResolvedValueOnce([
      { id: 20, name: 'Naruto', slug: 'naruto', image: '...', type: 'anime', status: 'finished', updatedAt: new Date() },
      { id: 442, name: 'Naruto Movie 1', slug: 'naruto-movie-1', image: '...', type: 'movie', status: 'finished', updatedAt: new Date() },
      { id: 1735, name: 'Naruto: Shippuuden', slug: 'naruto-shippuuden', image: '...', type: 'anime', status: 'finished', updatedAt: new Date() },
    ])
    // Only Naruto (20) and Shippuuden (1735) have mappings
    ;(db.groupBy as jest.Mock).mockResolvedValueOnce([{ titleId: 20 }, { titleId: 1735 }])

    const request = new NextRequest('http://localhost:3000/api/search?q=naruto')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Titles with mappings should be prioritized
    expect(data.results[0].hasMappings).toBe(true)
    expect(data.results[1].hasMappings).toBe(true)
    // Movie without mappings
    const movieResult = data.results.find((r: any) => r.id === 442)
    expect(movieResult.hasMappings).toBe(false)
  })

  // 6. Sorting — titles with mappings first, then by type priority
  it('should sort results: hasMappings first, then by type (anime > movie)', async () => {
    ;(db.limit as jest.Mock).mockResolvedValueOnce([
      { id: 442, name: 'Naruto Movie 1', slug: 'naruto-movie-1', image: '...', type: 'movie', status: 'finished', updatedAt: new Date() },
      { id: 20, name: 'Naruto', slug: 'naruto', image: '...', type: 'anime', status: 'finished', updatedAt: new Date() },
      { id: 1735, name: 'Naruto: Shippuuden', slug: 'naruto-shippuuden', image: '...', type: 'anime', status: 'finished', updatedAt: new Date() },
    ])
    ;(db.groupBy as jest.Mock).mockResolvedValueOnce([{ titleId: 20 }])

    const request = new NextRequest('http://localhost:3000/api/search?q=naruto')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Naruto (anime, hasMappings) should be first
    expect(data.results[0].id).toBe(20)
    expect(data.results[0].hasMappings).toBe(true)
  })

  it('should fetch from Jikan if DB has less than 3 fresh results', async () => {
    ;(db.limit as jest.Mock).mockResolvedValueOnce([]) // Empty DB
    ;(db.groupBy as jest.Mock).mockResolvedValueOnce([])

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            mal_id: 20,
            title: 'Naruto',
            images: { jpg: { image_url: 'https://cdn.myanimelist.net/naruto.jpg' } },
            type: 'TV',
            status: 'Finished Airing',
          }
        ],
      }),
    })
    // Mock for mapping enrichment on Jikan results
    ;(db.groupBy as jest.Mock).mockResolvedValueOnce([{ titleId: 20 }])

    const request = new NextRequest('http://localhost:3000/api/search?q=naruto')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(db.insert).toHaveBeenCalled()
  })

  it('should return 500 when Jikan API fails and DB is empty', async () => {
    ;(db.limit as jest.Mock).mockResolvedValueOnce([])
    ;(db.groupBy as jest.Mock).mockResolvedValueOnce([])
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const request = new NextRequest('http://localhost:3000/api/search?q=naruto')
    const response = await GET(request)

    expect(response.status).toBe(500)
  })
})
