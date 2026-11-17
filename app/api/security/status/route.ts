import { NextRequest, NextResponse } from 'next/server'
import { getSecurityLock } from '@/lib/telegramBot'
import { prisma } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lock = await getSecurityLock()
    return NextResponse.json({
      isLocked: lock.isLocked,
      updatedBy: lock.updatedBy,
      updatedAt: lock.updatedAt,
    })
  } catch (error: any) {
    console.error('Security status error:', error)
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body // 'lock' | 'unlock'
    const lock = await getSecurityLock()

    const updated = await prisma.securityLock.update({
      where: { id: lock.id },
      data: {
        isLocked: action === 'lock',
        updatedBy: 'pos_terminal',
      },
    })

    return NextResponse.json({
      success: true,
      isLocked: updated.isLocked,
    })
  } catch (error: any) {
    console.error('Update status error:', error)
    return NextResponse.json({ error: 'Failed to update security status' }, { status: 500 })
  }
}

