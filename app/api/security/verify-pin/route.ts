import { NextRequest, NextResponse } from 'next/server'
import { getSecurityLock } from '@/lib/telegramBot'
import { prisma } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { pin } = await req.json()
    if (!pin) {
      return NextResponse.json({ success: false, error: 'PIN code is required' }, { status: 400 })
    }

    const lock = await getSecurityLock()

    if (lock.pinCode !== String(pin).trim()) {
      return NextResponse.json(
        { success: false, error: 'Incorrect PIN code! Please try again.' },
        { status: 401 }
      )
    }

    // Correct PIN -> unlock terminal
    await prisma.securityLock.update({
      where: { id: lock.id },
      data: {
        isLocked: false,
        updatedBy: 'pos_keypad',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Terminal unlocked successfully',
      isLocked: false,
    })
  } catch (error: any) {
    console.error('Verify PIN error:', error)
    return NextResponse.json({ success: false, error: 'Failed to verify PIN' }, { status: 500 })
  }
}

