import { prisma } from './db'
import { sendSmsOtp, SmsResult } from './sms'

interface OtpEntry {
  code: string
  purpose: string
  expiresAt: number
  phoneOrUsername?: string
}

// In-memory OTP storage with automatic expiry
const otpStore = new Map<string, OtpEntry>()

export async function generateAndSendOtp(purpose: string = 'Login Authorization', phoneOrUsername: string = '+919908267125') {
  // Generate random 6-digit OTP
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes validity

  const key = `${purpose.toLowerCase()}_${phoneOrUsername.toLowerCase()}`
  otpStore.set(key, { code, purpose, expiresAt, phoneOrUsername })

  // Send exclusively via SMS Gateway to phone (+91 9908267125)
  console.log(`[SMS Gateway] Dispatching OTP ${code} directly to phone ${phoneOrUsername}...`)
  const smsResult = await sendSmsOtp(phoneOrUsername, code)

  return {
    success: true,
    smsSent: smsResult.success,
    smsProvider: smsResult.provider,
    error: smsResult.error,
    expiresInSeconds: 300,
    devCode: code,
    phone: phoneOrUsername,
  }
}

export function verifyOtp(
  enteredCode: string,
  purpose: string = 'Login Authorization',
  phoneOrUsername: string = '+919908267125'
): { valid: boolean; error?: string } {
  const cleanCode = enteredCode.trim()

  const key = `${purpose.toLowerCase()}_${phoneOrUsername.toLowerCase()}`
  const entry = otpStore.get(key)

  if (!entry) {
    // Check wildcard match across store
    for (const [k, v] of otpStore.entries()) {
      if (v.code === cleanCode && Date.now() <= v.expiresAt) {
        otpStore.delete(k)
        return { valid: true }
      }
    }
    return { valid: false, error: 'OTP has expired or was not requested. Please request a new OTP.' }
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key)
    return { valid: false, error: 'OTP has expired. Please request a new code.' }
  }

  if (entry.code !== cleanCode) {
    return { valid: false, error: 'Invalid OTP code. Please enter the correct 6-digit code.' }
  }

  // Valid, consume the OTP
  otpStore.delete(key)
  return { valid: true }
}
