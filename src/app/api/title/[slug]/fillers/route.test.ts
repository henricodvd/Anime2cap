/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ─── Mocks ───────────────────────────────────────────────
const mockOrderBy = jest.fn().mockResolvedValue([
  { id: 'uuid-f1', titleId: 20, episode: 5, chapter: 0, isFiller: true, isCanon: false, sourceType: 'original' },
  { id: 'uuid-f2', titleId: 20, episode: 12, chapter: 0, isFiller: true, isCanon: false, sourceType: 'original' },
])
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
}))

import { GET } from './route'

describe('GET /api/title/[id]/fillers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSelect.mockReturnValue({ from: mockFrom })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ orderBy: mockOrderBy })
  })

  it('should return only filler episodes', async () => {
    const request = new NextRequest('http://localhost:3000/api/title/20/fillers')
    const response = await GET(request, { params: { id: '20' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.fillers).toHaveLength(2)
    expect(data.fillers[0].isFiller).toBe(true)
    expect(data.fillers[1].isFiller).toBe(true)
  })

  it('should return empty when no fillers exist', async () => {
    mockOrderBy.mockResolvedValueOnce([])

    const request = new NextRequest('http://localhost:3000/api/title/20/fillers')
    const response = await GET(request, { params: { id: '20' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.fillers).toHaveLength(0)
  })
})
