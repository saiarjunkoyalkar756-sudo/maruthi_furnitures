import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)

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
    console.error('Auth me error:', error)
    return NextResponse.json({ authenticated: false, error: 'Internal server error' }, { status: 500 })
  }
}
