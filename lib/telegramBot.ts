import { prisma } from './db'

export interface TelegramProcessResult {
  ok: boolean
  message?: string
  processed?: number
}

// Get or create initial SecurityLock
export async function getSecurityLock() {
  let lock = await prisma.securityLock.findFirst()
  if (!lock) {
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
    lock = await prisma.securityLock.create({
      data: {
        pinCode: '1234',
        isLocked: false,
        lastRotatedDate: todayStr,
        updatedBy: 'system',
      },
    })
  }
  return lock
}

// Check and rotate PIN daily, sending notification to Telegram
export async function checkAndRotateDailyPin(forceNew: boolean = false) {
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
  let lock = await getSecurityLock()
  const config = await prisma.telegramConfig.findFirst()

  if (forceNew || lock.lastRotatedDate !== todayStr) {
    // Generate new random 4-digit PIN between 1000 and 9999
    const newPin = String(Math.floor(1000 + Math.random() * 9000))

    lock = await prisma.securityLock.update({
      where: { id: lock.id },
      data: {
        pinCode: newPin,
        lastRotatedDate: todayStr,
        updatedBy: forceNew ? 'telegram_manual_rotation' : 'daily_auto_rotation',
      },
    })

    // Send new daily PIN to Telegram bot
    if (config && config.botToken && config.chatId) {
      const msg =
        `🔐 *MARUTHI FURNITURES - ${forceNew ? 'PIN RE-GENERATED' : 'DAILY PIN ROTATION'}*\n` +
        `📅 Date: ${todayStr}\n\n` +
        `Your security PIN for today is:\n` +
        `👉 *${newPin}*\n\n` +
        `Terminal State: ${lock.isLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'}\n\n` +
        `• Change PIN manually: \`/pin <new_pin>\`\n` +
        `• Lock POS terminal: \`/lock\`\n` +
        `• Unlock POS terminal: \`/unlock\`\n` +
        `• Generate another PIN: \`/newpin\``

      await sendTelegramMessage(config.botToken, config.chatId, msg)
    }
  }

  return lock
}

// Get or create initial TelegramConfig
export async function getTelegramConfig() {
  let config = await prisma.telegramConfig.findFirst()
  if (!config) {
    config = await prisma.telegramConfig.create({
      data: {
        botToken: '',
        chatId: '',
        isActive: false,
        lastOffset: 0,
      },
    })
  }
  return config
}

// Send message to Telegram chat
export async function sendTelegramMessage(botToken: string, chatId: string | number, text: string) {
  if (!botToken || !chatId) {
    return { ok: false, error: 'Bot token or Chat ID is missing' }
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    })

    const data = await res.json()
    return data
  } catch (err: any) {
    console.error('Failed to send Telegram message:', err)
    return { ok: false, error: err.message }
  }
}

// Verify bot token by calling getMe
export async function verifyBotToken(botToken: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const data = await res.json()
    return data
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

// Concurrency guard to prevent multiple simultaneous getUpdates calls
let isPollingUpdates = false

// Process incoming Telegram updates via Long Polling
export async function processTelegramUpdates(): Promise<TelegramProcessResult> {
  if (isPollingUpdates) {
    return { ok: true, processed: 0, message: 'Poll already active' }
  }

  isPollingUpdates = true
  try {
    // 1. Run daily rotation check first
    await checkAndRotateDailyPin()

    const config = await getTelegramConfig()
    if (!config.botToken) {
      return { ok: false, message: 'Telegram Bot Token not configured yet' }
    }

    const token = config.botToken
    const offset = (config.lastOffset || 0) + 1

    let updates: any[] = []
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&limit=10&timeout=2`,
        { cache: 'no-store' }
      )
      const json = await res.json()
      if (!json.ok) {
        return { ok: false, message: json.description || 'Failed to fetch updates' }
      }
      updates = json.result || []
    } catch (err: any) {
      return { ok: false, message: `Telegram network error: ${err.message}` }
    }

    if (updates.length === 0) {
      return { ok: true, processed: 0 }
    }

    let maxUpdateId = config.lastOffset
    let currentLock = await getSecurityLock()

    for (const update of updates) {
      if (update.update_id > maxUpdateId) {
        maxUpdateId = update.update_id
      }

      const message = update.message
      if (!message || !message.text) continue

      const senderChatId = String(message.chat.id)
      const text = message.text.trim()
      const senderName = message.from?.first_name || message.chat?.first_name || 'Owner'

      // If chat ID is not bound yet, automatically pair with the sender!
      let activeChatId = config.chatId
      if (!activeChatId) {
        activeChatId = senderChatId
        await prisma.telegramConfig.update({
          where: { id: config.id },
          data: { chatId: activeChatId, isActive: true },
        })
      }

      // Only allow commands from configured/paired chat
      if (activeChatId && activeChatId !== senderChatId) {
        await sendTelegramMessage(
          token,
          senderChatId,
          `⛔ *Access Denied:* Unauthorized chat ID (${senderChatId}). The terminal is paired with another administrator.`
        )
        continue
      }

      const command = text.split(' ')[0].toLowerCase()
      const args = text.substring(command.length).trim()

      if (command === '/start' || command === '/help') {
        const helpMsg =
          `🛋️ *MARUTHI FURNITURES POS*\n` +
          `*Remote Security & Management Controller*\n\n` +
          `Hello *${senderName}*! Here are the commands available:\n\n` +
          `🔒 \`/lock\` - Lock the shop terminal immediately\n` +
          `🔓 \`/unlock\` - Unlock the shop terminal remotely\n` +
          `🔑 \`/pin <digits>\` - Change terminal PIN (e.g. \`/pin 9908\`)\n` +
          `🎲 \`/newpin\` - Generate a fresh random daily PIN right now\n` +
          `📊 \`/status\` - View current terminal lock state & PIN\n` +
          `💰 \`/sales\` - Today's live sales summary\n` +
          `❓ \`/help\` - Show this command list\n\n` +
          `*Current State:* ${currentLock.isLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'}\n` +
          `*Current PIN:* \`${currentLock.pinCode}\``

        await sendTelegramMessage(token, senderChatId, helpMsg)
      } else if (command === '/lock') {
        currentLock = await prisma.securityLock.update({
          where: { id: currentLock.id },
          data: { isLocked: true, updatedBy: `telegram:${senderName}` },
        })

        await sendTelegramMessage(
          token,
          senderChatId,
          `🔒 *TERMINAL LOCKED!*\n\n` +
            `The POS terminal has been locked remotely.\n` +
            `Staff can only unlock it using PIN: \`${currentLock.pinCode}\` or send \`/unlock\` here.`
        )
      } else if (command === '/unlock') {
        currentLock = await prisma.securityLock.update({
          where: { id: currentLock.id },
          data: { isLocked: false, updatedBy: `telegram:${senderName}` },
        })

        await sendTelegramMessage(
          token,
          senderChatId,
          `🔓 *TERMINAL UNLOCKED!*\n\n` +
            `The POS terminal lock has been removed.\n` +
            `The application is now open for billing & operations.`
        )
      } else if (command === '/newpin' || command === '/rotate') {
        currentLock = await checkAndRotateDailyPin(true)
      } else if (command === '/pin' || command === '/setpin') {
        const newPin = args.trim()
        if (!newPin || newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
          await sendTelegramMessage(
            token,
            senderChatId,
            `⚠️ *Invalid PIN format!*\n` +
              `PIN must be between 4 and 8 digits (numbers only).\n` +
              `*Example:* \`/pin 5678\``
          )
        } else {
          currentLock = await prisma.securityLock.update({
            where: { id: currentLock.id },
            data: { pinCode: newPin, updatedBy: `telegram:${senderName}` },
          })

          await sendTelegramMessage(
            token,
            senderChatId,
            `✅ *PIN UPDATED SUCCESSFULLY!*\n\n` +
              `• *New Security PIN:* \`${newPin}\`\n` +
              `• Terminal State: ${currentLock.isLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'}\n\n` +
              `The terminal can now be unlocked using: *${newPin}*`
          )
        }
      } else if (command === '/status') {
        const updatedAtStr = new Date(currentLock.updatedAt).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
        })

        await sendTelegramMessage(
          token,
          senderChatId,
          `📊 *TERMINAL STATUS REPORT*\n\n` +
            `• *Lock State:* ${currentLock.isLocked ? '🔒 LOCKED (Protected)' : '🔓 UNLOCKED (Active)'}\n` +
            `• *Current PIN:* \`${currentLock.pinCode}\`\n` +
            `• *Last Modified By:* ${currentLock.updatedBy}\n` +
            `• *Last Modified At:* ${updatedAtStr}\n` +
            `• *Daily Rotation Date:* ${currentLock.lastRotatedDate || 'Not set'}\n\n` +
            `To change PIN, use: \`/pin <new_pin>\` or \`/newpin\`\n` +
            `To toggle lock, use: \`/lock\` or \`/unlock\``
        )
      } else if (command === '/sales') {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const bills = await prisma.bill.findMany({
          where: { createdAt: { gte: startOfDay } },
          select: { total: true },
        })

        const totalSales = bills.reduce((sum, b) => sum + b.total, 0)
        const count = bills.length

        await sendTelegramMessage(
          token,
          senderChatId,
          `💰 *TODAY'S LIVE SALES SUMMARY*\n` +
            `📅 Date: ${new Date().toLocaleDateString('en-IN')}\n\n` +
            `• *Bills Generated:* ${count}\n` +
            `• *Total Revenue:* ₹${totalSales.toLocaleString('en-IN')}\n` +
            `• *Terminal Status:* ${currentLock.isLocked ? '🔒 Locked' : '🔓 Active'}`
        )
      } else {
        await sendTelegramMessage(
          token,
          senderChatId,
          `❓ *Unrecognized command:* \`${command}\`\n\n` +
            `Type \`/help\` to view list of all available commands.`
        )
      }
    }

    // Save the highest processed update id
    await prisma.telegramConfig.update({
      where: { id: config.id },
      data: { lastOffset: maxUpdateId, isActive: true },
    })

    return { ok: true, processed: updates.length }
  } finally {
    isPollingUpdates = false
  }
}
