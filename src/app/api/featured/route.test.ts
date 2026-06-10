/**
 * @jest-environment node
 */

// ─── Mocks ───────────────────────────────────────────────
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([
      { id: 1, name: 'Naruto', slug: 'naruto', image: 'img.jpg', score: '8.5', type: 'anime', episodes: 220, synopsis: '...', topRank: 1, status: 'finished', featuredUpdatedAt: new Date() },
      { id: 2, name: 'One Piece', slug: 'one-piece', image: 'img2.jpg', score: '9.0', type: 'anime', episodes: 1100, synopsis: '...', topRank: 2, status: 'ongoing', featuredUpdatedAt: new Date() },
    ]),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    onConflictDoUpdate: jest.fn().mockResolvedValue([]),
  }
}))

jest.mock('drizzle-orm', () => ({
  isNotNull: jest.fn((...args: any[]) => args),
  desc: jest.fn((...args: any[]) => args),
  sql: jest.fn((strings: TemplateStringsArray, ...values: any[]) => ({ strings, values })),
  eq: jest.fn((...args: any[]) => args),
}))

jest.mock('@/lib/jikan-client', () => ({
  jikanGet: jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      data: [
        { mal_id: 1, title: 'Naruto', images: { jpg: { image_url: 'img.jpg' } }, score: 8.5, type: 'TV', episodes: 220, synopsis: '...', status: 'Finished Airing', source: 'Manga' },
      ]
    }),
  }),
  JikanUnavailableError: class extends Error { name = 'JikanUnavailableError' },
}))

import { NextRequest } from 'next/server'
import { GET } from './route'

// ─── Tests ───────────────────────────────────────────────
describe('GET /api/featured', () => {
  it('returns featured titles sorted by rank', async () => {
    const req = new NextRequest('http://localhost/api/featured')
    const res = await GET(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.featured).toHaveLength(2)
    expect(data.featured[0].name).toBe('Naruto')
    expect(data.featured[0].topRank).toBe(1)
  })
})
