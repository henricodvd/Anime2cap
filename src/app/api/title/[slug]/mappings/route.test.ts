/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// ─── Mocks ───────────────────────────────────────────────
const mockOrderBy = jest.fn().mockResolvedValue([
  { id: 'uuid-1', titleId: 20, episode: 1, chapter: 1, isFiller: false, isCanon: true, sourceType: 'manga' },
  { id: 'uuid-2', titleId: 20, episode: 2, chapter: 3, isFiller: true, isCanon: false, sourceType: 'manga' },
])
const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy })
const mockFrom = jest.fn().mockReturnValue({ where: mockWhere })
const mockSelect = jest.fn().mockReturnValue({ from: mockFrom })

jest.mock('@/lib/db', () => ({
  db: {
    select: (...args: any[]) => mockSelect(...args),
  },
}))

import { GET } from './route'

describe('GET /api/title/[id]/mappings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSelect.mockReturnValue({ from: mockFrom })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ orderBy: mockOrderBy })
  })

  it('should return mappings for a title', async () => {
    const request = new NextRequest('http://localhost:3000/api/title/20/mappings')
    const response = await GET(request, { params: { id: '20' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.mappings).toHaveLength(2)
    expect(data.mappings[0].episode).toBe(1)
    expect(data.mappings[1].isFiller).toBe(true)
  })

  it('should return empty array when no mappings exist', async () => {
    mockOrderBy.mockResolvedValueOnce([])

    const request = new NextRequest('http://localhost:3000/api/title/999/mappings')
    const response = await GET(request, { params: { id: '999' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.mappings).toHaveLength(0)
  })
})
