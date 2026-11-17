import { NextRequest, NextResponse } from 'next/server'
import { processTelegramUpdates } from '@/lib/telegramBot'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || 'maruthi-internal-worker-auth'

async function isAuthorized(req: NextRequest): Promise<boolean> {
  // Check internal background poller header
  const internalHeader = req.headers.get('x-worker-secret')
  if (internalHeader && internalHeader === INTERNAL_SECRET) {
    return true
  }

  // Check authenticated user session
  const session = await getSessionFromRequest(req)
  return Boolean(session)
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await processTelegramUpdates()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Telegram poll error:', error)
    return NextResponse.json({ ok: false, error: 'Telegram poll error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await processTelegramUpdates()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Telegram poll error:', error)
    return NextResponse.json({ ok: false, error: 'Telegram poll error' }, { status: 500 })
  }
}

