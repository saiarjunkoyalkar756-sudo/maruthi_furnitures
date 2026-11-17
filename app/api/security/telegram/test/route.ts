import { NextRequest, NextResponse } from 'next/server'
import { getTelegramConfig, sendTelegramMessage } from '@/lib/telegramBot'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await getTelegramConfig()
    if (!config.botToken || !config.chatId) {
      return NextResponse.json(
        { error: 'Bot Token and Chat ID must both be configured before testing.' },
        { status: 400 }
      )
    }

    const testMsg =
      `🔔 *Maruthi Furnitures - Connection Test*\n\n` +
      `Your Telegram Bot is successfully connected to the Maruthi POS Terminal!\n\n` +
      `Try sending:\n` +
      `• \`/status\` to check current state\n` +
      `• \`/lock\` to test remote locking\n` +
      `• \`/sales\` to view today's revenue`

    const res = await sendTelegramMessage(config.botToken, config.chatId, testMsg)

    if (res.ok) {
      return NextResponse.json({ success: true, message: 'Test message sent to Telegram!' })
    } else {
      return NextResponse.json(
        { error: res.description || res.error || 'Failed to send message via Telegram API' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('Telegram test error:', error)
    return NextResponse.json({ error: 'Failed to test Telegram connection' }, { status: 500 })
  }
}

