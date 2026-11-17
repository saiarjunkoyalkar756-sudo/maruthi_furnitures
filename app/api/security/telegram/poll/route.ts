import { NextResponse } from 'next/server'
import { processTelegramUpdates } from '@/lib/telegramBot'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await processTelegramUpdates()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

export async function POST() {
  try {
    const result = await processTelegramUpdates()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}

