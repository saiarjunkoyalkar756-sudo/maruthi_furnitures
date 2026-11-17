import { NextResponse } from 'next/server'
import { getSecurityLock } from '@/lib/telegramBot'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const lock = await getSecurityLock()
    return NextResponse.json({
      isLocked: lock.isLocked,
      updatedBy: lock.updatedBy,
      updatedAt: lock.updatedAt,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

