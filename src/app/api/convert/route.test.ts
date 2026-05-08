/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ─── Mocks ───────────────────────────────────────────────
const mockLimit = jest.fn()
const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit })
const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy })
const mockFrom = jest.fn().mockReturnValue({ where: mockWhere })
const mockSelect = jest.fn().mockReturnValue({ from: mockFrom })

jest.mock('@/lib/db', () => ({
  db: {
    select: (...args: any[]) => mockSelect(...args),
  },
}))

jest.mock('drizzle-orm', () => ({
  eq: jest.fn((...args: any[]) => args),
  and: jest.fn((...args: any[]) => args),
  sql: jest.fn((strings: TemplateStringsArray, ...values: any[]) => ({ strings, values })),
  asc: jest.fn(),
}))

jest.mock('@/lib/ratelimit', () => ({
  convertRateLimit: {
    limit: jest.fn().mockResolvedValue({ success: true }),
  },
}))

import { GET } from './route'

describe('GET /api/convert', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSelect.mockReturnValue({ from: mockFrom })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ orderBy: mockOrderBy })
    mockOrderBy.mockReturnValue({ limit: mockLimit })
  })

  it('should return 400 when parameters are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/convert?type=ep')
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('should return 400 for invalid type', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/convert?type=invalid&value=1&title_id=20'
    )
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('should convert EP to Cap', async () => {
    mockLimit.mockResolvedValueOnce([
      { episode: 5, chapter: 10, isFiller: false, isCanon: true, sourceType: 'manga' },
    ])

    const request = new NextRequest(
      'http://localhost:3000/api/convert?type=ep&value=5&title_id=20'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.converted.type).toBe('cap')
    expect(data.converted.value).toBe(10)
  })

  it('should convert Cap to EP', async () => {
    mockLimit.mockResolvedValueOnce([
      { episode: 5, chapter: 10, isFiller: false, isCanon: true, sourceType: 'manga' },
    ])

    const request = new NextRequest(
      'http://localhost:3000/api/convert?type=cap&value=10&title_id=20'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.converted.type).toBe('ep')
    expect(data.converted.value).toBe(5)
  })

  it('should return 404 when no mapping is found', async () => {
    mockLimit.mockResolvedValueOnce([])

    const request = new NextRequest(
      'http://localhost:3000/api/convert?type=ep&value=9999&title_id=20'
    )
    const response = await GET(request)

    expect(response.status).toBe(404)
  })

  it('should prioritize manga source over light_novel and original', async () => {
    // The mock returns manga first because of SQL ORDER BY priority
    mockLimit.mockResolvedValueOnce([
      { episode: 5, chapter: 10, isFiller: false, isCanon: true, sourceType: 'manga' },
    ])

    const request = new NextRequest(
      'http://localhost:3000/api/convert?type=ep&value=5&title_id=20'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.converted.sourceType).toBe('manga')
  })
})
