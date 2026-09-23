/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from './route'

describe('GET /api/health', () => {
  it('should return status 200 with JSON { status: "ok" }', async () => {
    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET(request)

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toEqual({ status: 'ok' })
  })
})
