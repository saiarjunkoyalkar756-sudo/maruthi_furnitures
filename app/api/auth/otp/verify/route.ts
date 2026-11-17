import { NextRequest, NextResponse } from 'next/server'
import { verifyOtp } from '@/lib/otp'
import { prisma } from '@/lib/db'
import { createSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { code, purpose = 'Showroom POS Login', phoneOrUsername = '+919908267125' } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Please enter the 6-digit OTP' }, { status: 400 })
    }

    const cleanCode = code.trim().replace(/\D/g, '')
    if (cleanCode.length !== 6) {
      return NextResponse.json({ error: 'OTP must be exactly 6 digits' }, { status: 400 })
    }

    const result = verifyOtp(cleanCode, purpose, phoneOrUsername)

    if (!result.valid) {
      return NextResponse.json({ error: result.error || 'Invalid or expired OTP code' }, { status: 400 })
    }

    // Find the owner user account in database
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'maruthifurnitures001@gmail.com' },
          { role: 'owner' },
          { username: 'admin' },
        ],
      },
    })

    if (!user) {
      // Fallback user if database has no owner
      user = {
        id: 2,
        username: 'maruthifurnitures001@gmail.com',
        name: 'Alakanti Sai Nithin',
        role: 'owner',
        password: '',
        createdAt: new Date(),
      }
    }

    // Generate signed 30-day session token
    const token = await createSessionToken({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    }, 30)

    const response = NextResponse.json({
      success: true,
      message: 'OTP verified successfully. Access granted.',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    })

    // Set signed, secure HTTP-only session cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && req.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })

    response.cookies.set({
      name: 'maruthi_session',
      value: user.username,
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'OTP verification error' }, { status: 500 })
  }
}
