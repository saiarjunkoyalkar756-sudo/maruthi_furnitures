import { NextRequest, NextResponse } from 'next/server'
import { generateAndSendOtp } from '@/lib/otp'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { purpose = 'Showroom POS Login', phoneOrUsername = '+919908267125' } = body

    const result = await generateAndSendOtp(purpose, phoneOrUsername)

    let message = ''
    if (result.smsSent) {
      message = `SMS OTP sent directly to ${phoneOrUsername} via ${result.smsProvider || 'carrier SMS'}`
    } else if (result.error) {
      message = `${result.error}`
    } else {
      message = `SMS OTP dispatched to phone ${phoneOrUsername}`
    }

    return NextResponse.json({
      success: true,
      message,
      phone: phoneOrUsername,
      smsSent: result.smsSent,
      smsProvider: result.smsProvider,
      gatewayError: result.error,
      expiresInSeconds: result.expiresInSeconds,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
