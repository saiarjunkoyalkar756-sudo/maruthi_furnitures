import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken, AUTH_COOKIE_NAME } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value
    const session = await verifySessionToken(token)

    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
      },
    })

    return NextResponse.json({
      authenticated: true,
      user: user || {
        id: session.userId,
        username: session.username,
        name: session.name,
        role: session.role,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 })
  }
}
