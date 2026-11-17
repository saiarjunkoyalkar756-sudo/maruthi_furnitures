export interface SmsResult {
  success: boolean
  provider?: string
  messageId?: string
  error?: string
}

/**
 * Sends a real SMS OTP to the customer or owner phone number
 * Supports Indian Telecom gateways (Fast2SMS, 2Factor, Textlocal) & Global (Twilio, Webhooks)
 */
export async function sendSmsOtp(phone: string, otp: string): Promise<SmsResult> {
  const digits = phone.replace(/\D/g, '')
  const cleanPhone = digits.length >= 10 ? digits.slice(-10) : digits

  // 1. Fast2SMS (Indian Gateway - Free/Direct OTP route)
  const fast2smsKey = process.env.FAST2SMS_API_KEY
  if (fast2smsKey) {
    try {
      // First attempt: OTP route
      const otpUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(
        fast2smsKey
      )}&route=otp&variables_values=${encodeURIComponent(otp)}&flash=0&numbers=${encodeURIComponent(
        cleanPhone
      )}`

      const res = await fetch(otpUrl, {
        method: 'GET',
        headers: { 'cache-control': 'no-cache' },
      })
      const data = await res.json()
      if (data && (data.return === true || data.status_code === 200)) {
        console.log(`[Fast2SMS] Successfully sent SMS OTP to ${cleanPhone}, reqId: ${data.request_id}`)
        return { success: true, provider: 'Fast2SMS', messageId: data.request_id }
      }

      // Second attempt: Quick SMS route
      const msg = `Your Maruthi Furnitures Login OTP is ${otp}. Valid for 5 minutes.`
      const quickUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(
        fast2smsKey
      )}&route=q&message=${encodeURIComponent(msg)}&language=english&flash=0&numbers=${encodeURIComponent(
        cleanPhone
      )}`

      const quickRes = await fetch(quickUrl, {
        method: 'GET',
        headers: { 'cache-control': 'no-cache' },
      })
      const quickData = await quickRes.json()
      if (quickData && (quickData.return === true || quickData.status_code === 200)) {
        console.log(`[Fast2SMS Quick] Successfully sent SMS OTP to ${cleanPhone}`)
        return { success: true, provider: 'Fast2SMS (Quick)', messageId: quickData.request_id }
      }

      console.warn('[Fast2SMS] Gateway message:', data.message || quickData.message)
      return {
        success: false,
        provider: 'Fast2SMS',
        error: data.message || quickData.message,
      }
    } catch (e: any) {
      console.error('[Fast2SMS] Exception:', e.message)
    }
  }

  // 2. 2Factor.in (Indian SMS OTP Gateway)
  const twoFactorKey = process.env.TWO_FACTOR_API_KEY
  if (twoFactorKey) {
    try {
      const url = `https://2factor.in/v1/API/V1/${encodeURIComponent(twoFactorKey)}/SMS/${encodeURIComponent(cleanPhone)}/${encodeURIComponent(otp)}/OTP1`
      const res = await fetch(url)
      const data = await res.json()
      if (data && data.Status === 'Success') {
        console.log(`[2Factor] Successfully sent SMS OTP to ${cleanPhone}`)
        return { success: true, provider: '2Factor.in', messageId: data.Details }
      }
    } catch (e: any) {
      console.error('[2Factor] Exception:', e.message)
    }
  }

  // 3. Textlocal (Indian SMS Gateway)
  const textlocalKey = process.env.TEXTLOCAL_API_KEY
  if (textlocalKey) {
    try {
      const message = encodeURIComponent(`Your Maruthi Furnitures OTP is ${otp}. Valid for 5 minutes.`)
      const url = `https://api.textlocal.in/send/?apikey=${encodeURIComponent(textlocalKey)}&numbers=91${encodeURIComponent(cleanPhone)}&message=${message}&sender=TXTLCL`
      const res = await fetch(url)
      const data = await res.json()
      if (data && data.status === 'success') {
        return { success: true, provider: 'Textlocal' }
      }
    } catch (e: any) {
      console.error('[Textlocal] Exception:', e.message)
    }
  }

  // 4. Twilio Integration (Global Carrier SMS)
  const twilioSid = process.env.TWILIO_ACCOUNT_SID
  const twilioToken = process.env.TWILIO_AUTH_TOKEN
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER
  if (twilioSid && twilioToken && twilioFrom) {
    try {
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')
      const targetNumber = phone.startsWith('+') ? phone : `+91${cleanPhone}`
      const body = new URLSearchParams({
        To: targetNumber,
        From: twilioFrom,
        Body: `Your Maruthi Furnitures Login OTP is: ${otp}. Valid for 5 minutes.`,
      })

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      )
      const data = await res.json()
      if (data.sid) {
        return { success: true, provider: 'Twilio', messageId: data.sid }
      }
    } catch (e: any) {
      console.error('[Twilio] Exception:', e.message)
    }
  }

  // 5. Custom SMS Webhook / Android SMS Gateway URL
  const genericSmsUrl = process.env.SMS_GATEWAY_URL
  if (genericSmsUrl) {
    try {
      const formattedUrl = genericSmsUrl
        .replace('{phone}', cleanPhone)
        .replace('{otp}', otp)
      const res = await fetch(formattedUrl)
      if (res.ok) {
        return { success: true, provider: 'Custom SMS Gateway' }
      }
    } catch (e: any) {
      console.error('[Custom SMS] Exception:', e.message)
    }
  }

  // Fallback indicator
  console.warn(`[SMS Gateway] No active SMS API key configured in .env. OTP for ${cleanPhone}: ${otp}`)
  return {
    success: false,
    error: 'SMS API key not configured or requires gateway verification in Fast2SMS dashboard.',
  }
}
