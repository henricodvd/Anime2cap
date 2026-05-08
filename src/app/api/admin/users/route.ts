import { NextRequest, NextResponse } from 'next/server'

/**
 * 🍯 HONEYPOT ENDPOINT — /api/admin/users
 * 
 * This endpoint does NOT exist in the real application.
 * Any access indicates malicious scanning or enumeration attempts.
 * Logs the suspicious activity and returns fake data to not reveal it's a trap.
 */

function logSuspiciousActivity(ip: string, type: string, path: string) {
  console.warn(`[HONEYPOT HIT] type=${type} ip=${ip} path=${path} timestamp=${new Date().toISOString()}`)
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  logSuspiciousActivity(ip, 'honeypot_admin_users', '/api/admin/users')

  // Return fake data — don't reveal this is a honeypot
  return NextResponse.json({ users: [], total: 0, page: 1 })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  logSuspiciousActivity(ip, 'honeypot_admin_users_post', '/api/admin/users')

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}
