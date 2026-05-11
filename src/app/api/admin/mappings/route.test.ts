/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ─── Mocks ───────────────────────────────────────────────
const mockValues = jest.fn().mockResolvedValue([])
const mockInsert = jest.fn().mockReturnValue({ values: mockValues })

jest.mock('@/lib/db', () => ({
  db: {
    insert: (...args: any[]) => mockInsert(...args),
  },
}))

// Set env before import
process.env.ADMIN_API_KEY = 'test-admin-key'

jest.mock('@/lib/ratelimit', () => ({
  adminRateLimit: {
    limit: jest.fn().mockResolvedValue({ success: true }),
  },
}))

import { POST } from './route'

// ─── Tests ───────────────────────────────────────────────
describe('POST /api/admin/mappings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockInsert.mockReturnValue({ values: mockValues })
  })

  it('should return 401 when API key is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/mappings', {
      method: 'POST',
      body: JSON.stringify({ mappings: [] }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should return 401 when API key is wrong', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/mappings', {
      method: 'POST',
      headers: { 'x-api-key': 'wrong-key' },
      body: JSON.stringify({ mappings: [] }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should return 400 when mappings array is empty or missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/mappings', {
      method: 'POST',
      headers: {
        'x-api-key': 'test-admin-key',
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should return 200 and insert mappings with correct API key', async () => {
    const payload = {
      mappings: [
        { titleId: 20, episode: 1, chapter: 1, isFiller: false, isCanon: true, sourceType: 'manga' },
        { titleId: 20, episode: 2, chapter: 2, isFiller: false, isCanon: true, sourceType: 'manga' },
      ],
    }

    const request = new NextRequest('http://localhost:3000/api/admin/mappings', {
      method: 'POST',
      headers: {
        'x-api-key': 'test-admin-key',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.inserted).toBe(2)
    
    // Expect strings because they are converted for the database numeric type
    const expected = payload.mappings.map(m => ({
      ...m,
      episode: m.episode.toString(),
      chapter: m.chapter?.toString() || null
    }))
    expect(mockValues).toHaveBeenCalledWith(expected)
  })
})
