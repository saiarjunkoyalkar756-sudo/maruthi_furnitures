import { NextResponse } from 'next/server'
import { getSecurityLock, getTelegramConfig, verifyBotToken } from '@/lib/telegramBot'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
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
      rawToken: config.botToken,
      chatId: config.chatId,
      isTelegramActive: config.isActive,
      botInfo,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { pinCode, botToken, chatId } = body

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

