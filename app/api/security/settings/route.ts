import { NextRequest, NextResponse } from 'next/server'
import { getSecurityLock, getTelegramConfig, verifyBotToken, checkAndRotateDailyPin } from '@/lib/telegramBot'
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
    const config = await getTelegramConfig()

    let botInfo = null
    if (config.botToken) {
      const me = await verifyBotToken(config.botToken)
      if (me.ok) {
        botInfo = {
          username: me.result.username,
          firstName: me.result.first_name,
        }
      }
    }

    return NextResponse.json({
      pinCode: lock.pinCode,
      isLocked: lock.isLocked,
      lockUpdatedBy: lock.updatedBy,
      lockUpdatedAt: lock.updatedAt,
      botToken: config.botToken ? `${config.botToken.substring(0, 8)}...` : '',
      hasToken: Boolean(config.botToken),
      chatId: config.chatId,
      isTelegramActive: config.isActive,
      botInfo,
      lock: {
        id: lock.id,
        pinCode: lock.pinCode,
        isLocked: lock.isLocked,
        lastRotatedDate: lock.lastRotatedDate,
        updatedBy: lock.updatedBy,
      },
      telegram: {
        id: config.id,
        chatId: config.chatId,
        isActive: config.isActive,
      },
    })
  } catch (error: any) {
    console.error('Security settings error:', error)
    return NextResponse.json({ error: 'Failed to fetch security settings' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { pinCode, botToken, chatId, rotatePin } = body

    if (rotatePin) {
      const newLock = await checkAndRotateDailyPin(true)
      return NextResponse.json({
        success: true,
        message: 'PIN rotated successfully',
        lock: newLock,
      })
    }

    const lock = await getSecurityLock()
    const config = await getTelegramConfig()

    // Update PIN if provided
    if (pinCode !== undefined) {
      const cleanPin = String(pinCode).trim()
      if (cleanPin.length < 4 || cleanPin.length > 8 || !/^\d+$/.test(cleanPin)) {
        return NextResponse.json(
          { error: 'PIN must be between 4 and 8 numeric digits' },
          { status: 400 }
        )
      }

      await prisma.securityLock.update({
        where: { id: lock.id },
        data: {
          pinCode: cleanPin,
          updatedBy: 'settings_ui',
        },
      })
    }

    // Update Telegram Bot Token & Chat ID if provided
    const updateData: any = {}
    if (botToken !== undefined) {
      updateData.botToken = String(botToken).trim()
    }
    if (chatId !== undefined) {
      updateData.chatId = String(chatId).trim()
      if (updateData.chatId) updateData.isActive = true
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.telegramConfig.update({
        where: { id: config.id },
        data: updateData,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Security settings updated successfully',
    })
  } catch (error: any) {
    console.error('Update security settings error:', error)
    return NextResponse.json({ error: 'Failed to update security settings' }, { status: 500 })
  }
}

