/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ─── Mocks ───────────────────────────────────────────────
const mockLimit = jest.fn()
const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit })
const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy })
const mockInnerJoin = jest.fn().mockReturnValue({ where: mockWhere })
const mockFrom = jest.fn().mockReturnValue({ innerJoin: mockInnerJoin, where: mockWhere })
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
    mockFrom.mockReturnValue({ innerJoin: mockInnerJoin, where: mockWhere })
    mockInnerJoin.mockReturnValue({ where: mockWhere })
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
      { episode: 5, chapter: 10, isFiller: false, isCanon: true, sourceType: 'manga', titleSource: 'Manga' },
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
      { episode: 5, chapter: 10, isFiller: false, isCanon: true, sourceType: 'manga', titleSource: 'Manga' },
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

  it('should return 404 Not found when no mapping is found and not exceeding max', async () => {
    mockLimit
      .mockResolvedValueOnce([]) // First query (actual mapping)
      .mockResolvedValueOnce([{ maxVal: 50 }]) // Second query (max available)

    const request = new NextRequest(
      'http://localhost:3000/api/convert?type=ep&value=20&title_id=20'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not found')
  })

  it('should return 404 ExceededMax when input exceeds max mapped value', async () => {
    mockLimit
      .mockResolvedValueOnce([]) // First query
      .mockResolvedValueOnce([{ maxVal: 12 }]) // Second query

    const request = new NextRequest(
      'http://localhost:3000/api/convert?type=ep&value=13&title_id=20'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('ExceededMax')
    expect(data.maxAvailable).toBe(12)
  })

  // ─── BUG 1 & 2: sourceType should be derived from title.source ───

  it('should derive sourceType "game" from titles.source "Game"', async () => {
    mockLimit.mockResolvedValueOnce([
      { episode: 1, chapter: null, isFiller: false, isCanon: true, sourceType: 'manga', titleSource: 'Game' },
    ])

    const request = new NextRequest(
      'http://localhost:3000/api/convert?type=ep&value=1&title_id=53631'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.converted.sourceType).toBe('game')
  })

  it('should derive sourceType "light_novel" from titles.source "Light novel"', async () => {
    mockLimit.mockResolvedValueOnce([
      { episode: 1, chapter: 1, isFiller: false, isCanon: true, sourceType: 'manga', titleSource: 'Light novel' },
    ])

    const request = new NextRequest(
      'http://localhost:3000/api/convert?type=ep&value=1&title_id=31240'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.converted.sourceType).toBe('light_novel')
  })

  it('should derive sourceType "manga" from titles.source "Manga"', async () => {
    mockLimit.mockResolvedValueOnce([
      { episode: 5, chapter: 10, isFiller: false, isCanon: true, sourceType: 'manga', titleSource: 'Manga' },
    ])

    const request = new NextRequest(
      'http://localhost:3000/api/convert?type=ep&value=5&title_id=20'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.converted.sourceType).toBe('manga')
  })

  it('should return "original" for titles with source "Original"', async () => {
    mockLimit.mockResolvedValueOnce([
      { episode: 1, chapter: null, isFiller: false, isCanon: true, sourceType: 'manga', titleSource: 'Original' },
    ])

    const request = new NextRequest(
      'http://localhost:3000/api/convert?type=ep&value=1&title_id=99999'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.converted.sourceType).toBe('original')
  })

  it('should return "unknown" when titles.source is null', async () => {
    mockLimit.mockResolvedValueOnce([
      { episode: 1, chapter: 1, isFiller: false, isCanon: true, sourceType: 'manga', titleSource: null },
    ])

    const request = new NextRequest(
      'http://localhost:3000/api/convert?type=ep&value=1&title_id=12345'
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.converted.sourceType).toBe('unknown')
  })

  it('should use innerJoin with titles table', async () => {
    mockLimit.mockResolvedValueOnce([
      { episode: 1, chapter: 1, isFiller: false, isCanon: true, sourceType: 'manga', titleSource: 'Manga' },
    ])

    const request = new NextRequest(
      'http://localhost:3000/api/convert?type=ep&value=1&title_id=20'
    )
    await GET(request)

    expect(mockInnerJoin).toHaveBeenCalled()
  })
})
