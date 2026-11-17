import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, password, rememberMe = true } = await req.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Please enter your username/email and password' },
        { status: 400 }
      )
    }

    const cleanInput = username.trim()
    const lowerInput = cleanInput.toLowerCase()

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: lowerInput },
          { username: cleanInput },
        ],
      },
    })

    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid username/email or password' },
        { status: 401 }
      )
    }

    const expiryDays = rememberMe ? 30 : 1
    const token = await createSessionToken(
      {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      expiryDays
    )

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    })

    // Set signed, secure HTTP-only session cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && req.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: expiryDays * 24 * 60 * 60,
    })

    // Also set legacy readable flag for client-side quick checks
    response.cookies.set({
      name: 'maruthi_session',
      value: user.username,
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: expiryDays * 24 * 60 * 60,
    })

    return response
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Login error' }, { status: 500 })
  }
}
