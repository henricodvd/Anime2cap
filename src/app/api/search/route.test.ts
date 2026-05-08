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
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    onConflictDoUpdate: jest.fn().mockResolvedValue([]),
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
    // Default rate limit success
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

  // 2. Rate Limiting Tests
  it('should return 429 when rate limit is exceeded', async () => {
    __setLimitSuccess(false)

    const request = new NextRequest('http://localhost:3000/api/search?q=naruto')
    const response = await GET(request)
    expect(response.status).toBe(429)

    __setLimitSuccess(true) // reset
  })

  // 3. Caching & Slug Tests
  it('should return cached DB results if updated within 7 days', async () => {
    // Mock DB returning a fresh result
    ;(db.limit as jest.Mock).mockResolvedValueOnce([{
      id: 20,
      name: 'Naruto',
      slug: 'naruto',
      image: 'https://cdn.myanimelist.net/naruto.jpg',
      type: 'anime',
      status: 'finished',
      updatedAt: new Date() // fresh
    }])

    const request = new NextRequest('http://localhost:3000/api/search?q=naruto')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results[0].slug).toBe('naruto')
    expect(mockFetch).not.toHaveBeenCalled() // Did not hit Jikan
  })

  it('should fetch from Jikan if DB is empty or stale', async () => {
    // Mock DB returning empty
    ;(db.limit as jest.Mock).mockResolvedValueOnce([])

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

    const request = new NextRequest('http://localhost:3000/api/search?q=naruto')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(db.insert).toHaveBeenCalled() // Cached the result
  })

  it('should generate valid slugs when fetching from Jikan', async () => {
    ;(db.limit as jest.Mock).mockResolvedValueOnce([])
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            mal_id: 1735,
            title: 'Naruto: Shippuuden!',
            images: { jpg: { image_url: '...' } },
            type: 'TV',
            status: 'Finished Airing',
          }
        ],
      }),
    })

    const request = new NextRequest('http://localhost:3000/api/search?q=naruto')
    await GET(request)

    // Verify the insert contains the slug "naruto-shippuuden"
    expect(db.values).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          slug: 'naruto-shippuuden' // special chars stripped, spaces to dashes
        })
      ])
    )
  })

  it('should return 500 when Jikan API fails and DB is empty', async () => {
    ;(db.limit as jest.Mock).mockResolvedValueOnce([])
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    const request = new NextRequest('http://localhost:3000/api/search?q=naruto')
    const response = await GET(request)

    expect(response.status).toBe(500)
  })
})
