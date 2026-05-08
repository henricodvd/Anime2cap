import { NextRequest, NextResponse } from 'next/server'

/**
 * 🍯 HONEYPOT ENDPOINT — /api/v0/auth
 * 
 * Simulates a deprecated auth endpoint. No real auth exists in this version.
 * Any access indicates automated scanning or attack tools probing for auth endpoints.
 */

function logSuspiciousActivity(ip: string, type: string, path: string) {
  console.warn(`[HONEYPOT HIT] type=${type} ip=${ip} path=${path} timestamp=${new Date().toISOString()}`)
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  logSuspiciousActivity(ip, 'honeypot_v0_auth_get', '/api/v0/auth')

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  logSuspiciousActivity(ip, 'honeypot_v0_auth_post', '/api/v0/auth')

  // Simulate a "thinking" delay to waste attacker time
  await new Promise(resolve => setTimeout(resolve, 2000))

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}
