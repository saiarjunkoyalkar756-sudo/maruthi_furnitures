'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextDestination = searchParams.get('next') || '/dashboard'

  // Authentication Mode
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password')

  // Password Login States
  const [username, setUsername] = useState('Maruthifurnitures001@gmail.com')
  const [password, setPassword] = useState('Maruthi@123')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // SMS OTP States
  const [phone, setPhone] = useState('+919908267125')
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [otpSent, setOtpSent] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [gatewayMessage, setGatewayMessage] = useState('')
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null)
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Global UI States
  const [loading, setLoading] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Cooldown countdown timer for OTP resend
  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCooldown])

  // Quick fill helper
  const handleQuickFill = () => {
    setUsername('Maruthifurnitures001@gmail.com')
    setPassword('Maruthi@123')
    setErrorMessage('')
  }

  // --- Password Login Handler ---
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email/username and password.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          rememberMe,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials. Please try again.')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('maruthi_user', JSON.stringify(data.user))
      }

      setSuccessMessage(`Access Granted. Welcome, ${data.user.name || 'Store Manager'}!`)
      setTimeout(() => {
        router.push(nextDestination)
        router.refresh()
      }, 400)
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please verify credentials.')
    } finally {
      setLoading(false)
    }
  }

  // --- Send SMS OTP Handler ---
  const handleSendOtp = async () => {
    setErrorMessage('')
    setSuccessMessage('')
    setSendingOtp(true)

    const cleanPhone = phone.trim() || '+919908267125'

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'Showroom POS Terminal Login',
          phoneOrUsername: cleanPhone,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch SMS OTP')
      }

      setOtpSent(true)
      setOtpCooldown(60)
      setOtpDigits(['', '', '', '', '', ''])

      const msg = data.smsSent
        ? `SMS OTP dispatched via ${data.smsProvider || 'carrier SMS'} to ${cleanPhone}`
        : `SMS OTP initiated for ${cleanPhone}`

      setGatewayMessage(msg)
      setSuccessMessage(`6-digit verification code sent to ${cleanPhone}`)

      if (data.devCode) {
        setDevOtpHint(data.devCode)
      }

      // Auto-focus first box
      setTimeout(() => {
        otpInputRefs.current[0]?.focus()
      }, 100)
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not send SMS OTP. Please retry.')
    } finally {
      setSendingOtp(false)
    }
  }

  // --- 6-Digit OTP Box Handlers ---
  const handleDigitChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1)
    const newDigits = [...otpDigits]
    newDigits[index] = char
    setOtpDigits(newDigits)

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }

    const fullCode = newDigits.join('')
    if (fullCode.length === 6 && !newDigits.includes('')) {
      verifyOtpCode(fullCode)
    }
  }

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const newDigits = [...otpDigits]
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || ''
    }
    setOtpDigits(newDigits)

    const nextIndex = Math.min(pasted.length, 5)
    otpInputRefs.current[nextIndex]?.focus()

    if (pasted.length === 6) {
      verifyOtpCode(pasted)
    }
  }

  // --- Verify OTP Handler ---
  const verifyOtpCode = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('')
    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the SMS OTP.')
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          purpose: 'Showroom POS Terminal Login',
          phoneOrUsername: phone.trim() || '+919908267125',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired OTP code.')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('maruthi_user', JSON.stringify(data.user))
      }

      setSuccessMessage('OTP Verified Successfully! Opening terminal...')
      setTimeout(() => {
        router.push(nextDestination)
        router.refresh()
      }, 400)
    } catch (err: any) {
      setErrorMessage(err.message || 'OTP verification failed. Please try again.')
      setOtpDigits(['', '', '', '', '', ''])
      otpInputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#030d07] flex items-center justify-center p-0 lg:p-6 select-none overflow-x-hidden font-sans">
      {/* Background Lighting & Geometry */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(0,168,90,0.22),transparent)] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#072013_1px,transparent_1px),linear-gradient(to_bottom,#072013_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_60%,transparent_100%)] opacity-35 pointer-events-none" />

      {/* Main Dual-Column Master Frame */}
      <div className="relative z-10 w-full max-w-6xl min-h-screen lg:min-h-[700px] bg-[#07170f]/90 lg:rounded-[2.5rem] border border-white/10 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex flex-col lg:flex-row overflow-hidden">
        
        {/* ================= LEFT SHOWROOM SHOWCASE COLUMN (Desktop Only / Hidden on Mobile) ================= */}
        <div className="hidden lg:flex lg:w-7/12 flex-col justify-between p-12 bg-gradient-to-br from-[#061910] via-[#04130c] to-[#020b06] border-r border-white/5 relative overflow-hidden">
          {/* Subtle Ambient Light Orb inside Left Side */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          {/* Top Brand Banner */}
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-2xl bg-white/10 p-2.5 border border-white/15 backdrop-blur-md shadow-inner flex items-center justify-center">
                <Image
                  src="/logo.jpg"
                  alt="Maruthi Furnitures"
                  fill
                  unoptimized
                  className="object-contain p-1"
                  priority
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400 font-mono">
                    EST. 2010
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span className="text-[10px] font-semibold text-emerald-300 font-mono uppercase">
                    SIDDIPET FLAGSHIP
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  MARUTHI FURNITURES
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Mattresses &bull; Steel Almirahs &bull; Coolers &bull; Wooden Cots
                </p>
              </div>
            </div>

            {/* Showcase Title */}
            <div className="pt-6 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Showroom ERP &bull; Version 2.6 Live</span>
              </div>
              <h1 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight">
                Precision Billing &amp; <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300">
                  Inventory Operating System
                </span>
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
                Streamlined counter sales with tax-exempt invoicing, instant dynamic UPI QR payments, wholesale inventory intelligence, and customer Khata tracking.
              </p>
            </div>
          </div>

          {/* Middle 3 Feature Highlights */}
          <div className="grid grid-cols-1 gap-3.5 my-8 relative z-10">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-xs flex items-start gap-3.5 hover:bg-white/[0.05] transition-colors">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">
                  Zero-GST Counter Invoicing &amp; Dynamic UPI
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Generate A4 and 3-inch thermal receipts with automatic sequential numbering and exact UPI QR codes.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-xs flex items-start gap-3.5 hover:bg-white/[0.05] transition-colors">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">
                  Live Showroom Catalog &amp; Wholesale Analytics
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Instant visibility into Air Coolers, Orthopedic Mattresses, Dressing Tables, and Steel Almirah margins.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] backdrop-blur-xs flex items-start gap-3.5 hover:bg-white/[0.05] transition-colors">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white tracking-wide">
                  Cellular SMS OTP &amp; Khata Ledger
                </h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Direct mobile SMS authentication for owner terminal access and automated customer balance reminders.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Showroom Footer info */}
          <div className="pt-6 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500 relative z-10">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Counter Terminal 1 &bull; Active</span>
            </div>
            <span className="font-mono text-[11px] text-zinc-400">
              Bypass Road, Siddipet
            </span>
          </div>
        </div>

        {/* ================= RIGHT AUTHENTICATION CARD COLUMN ================= */}
        <div className="w-full lg:w-5/12 bg-white flex flex-col justify-center p-6 sm:p-10 lg:p-12 relative">
          <div className="max-w-md w-full mx-auto space-y-6">

            {/* Mobile Header (Brand Badge for Phones) */}
            <div className="lg:hidden text-center space-y-3 pb-2">
              <div className="inline-flex justify-center">
                <div className="relative w-44 h-16 bg-zinc-50 rounded-2xl p-2 border border-zinc-200/80 shadow-xs flex items-center justify-center">
                  <Image
                    src="/logo.jpg"
                    alt="Maruthi Furnitures"
                    fill
                    unoptimized
                    className="object-contain p-1"
                    priority
                  />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-black text-zinc-900 tracking-tight">
                  Maruthi Furnitures &amp; Mattresses
                </h2>
                <p className="text-xs text-zinc-500">
                  Showroom POS &bull; Siddipet Flagship
                </p>
              </div>
            </div>

            {/* Terminal Sign In Header */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                  Terminal Sign In
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/70 px-2.5 py-1 rounded-full">
                  Secure Access
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Enter your credentials or request an SMS OTP to unlock the showroom POS.
              </p>
            </div>

            {/* Method Segmented Switcher (10/10 Interactive Pill) */}
            <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-zinc-100 border border-zinc-200/80 text-xs font-bold text-zinc-600">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('password')
                  setErrorMessage('')
                  setSuccessMessage('')
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                  authMethod === 'password'
                    ? 'bg-white text-zinc-950 shadow-sm font-extrabold'
                    : 'hover:text-zinc-900 hover:bg-white/50'
                }`}
              >
                <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Password</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMethod('otp')
                  setErrorMessage('')
                  setSuccessMessage('')
                  if (!otpSent) {
                    handleSendOtp()
                  }
                }}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all ${
                  authMethod === 'otp'
                    ? 'bg-white text-zinc-950 shadow-sm font-extrabold'
                    : 'hover:text-zinc-900 hover:bg-white/50'
                }`}
              >
                <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>Mobile SMS OTP</span>
              </button>
            </div>

            {/* Error Message Toast */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3.5 rounded-2xl flex items-start gap-3 shadow-xs">
                <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Success Message Toast */}
            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs p-3.5 rounded-2xl flex items-start gap-3 shadow-xs">
                <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold">{successMessage}</span>
              </div>
            )}

            {/* ================= TAB 1: PASSWORD LOGIN ================= */}
            {authMethod === 'password' && (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-800">
                      Email or Username
                    </label>
                    <button
                      type="button"
                      onClick={handleQuickFill}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
                    >
                      Fill Owner Email
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Maruthifurnitures001@gmail.com"
                      autoComplete="username"
                      className="w-full bg-zinc-50 border border-zinc-200/90 rounded-2xl pl-10 pr-3.5 py-3 text-xs font-semibold text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/80 focus:border-emerald-700 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-800">
                      Password
                    </label>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Owner Protected
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      className="w-full bg-zinc-50 border border-zinc-200/90 rounded-2xl pl-10 pr-10 py-3 text-xs font-semibold text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/80 focus:border-emerald-700 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember device checkbox */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2.5 text-zinc-600 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-md text-emerald-700 focus:ring-emerald-700 border-zinc-300"
                    />
                    <span>Remember terminal for 30 days</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#005a36] via-[#00472b] to-[#003822] hover:from-[#00472b] hover:to-[#002717] text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Authenticating Terminal...</span>
                    </>
                  ) : (
                    <span>Sign In with Password &rarr;</span>
                  )}
                </button>
              </form>
            )}

            {/* ================= TAB 2: SMS MOBILE OTP ================= */}
            {authMethod === 'otp' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                    Owner Cellular Number (+91)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+919908267125"
                        className="w-full bg-zinc-50 border border-zinc-200/90 rounded-2xl pl-10 pr-3.5 py-3 text-xs font-mono font-bold text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/80 focus:border-emerald-700 transition-all shadow-2xs"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={sendingOtp || otpCooldown > 0}
                      onClick={handleSendOtp}
                      className="px-4 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-zinc-200 disabled:text-zinc-500 text-white rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all shadow-xs"
                    >
                      {sendingOtp ? 'Sending...' : otpCooldown > 0 ? `Resend (${otpCooldown}s)` : otpSent ? 'Resend SMS' : 'Send SMS OTP'}
                    </button>
                  </div>
                  {gatewayMessage && (
                    <p className="text-[11px] text-zinc-500 mt-1.5 font-medium">
                      {gatewayMessage}
                    </p>
                  )}
                </div>

                {/* 6 Individual Modern PIN Digit Boxes */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-800">
                      Enter 6-Digit SMS Security Code
                    </label>
                    {otpCooldown > 0 ? (
                      <span className="text-[11px] text-zinc-400 font-mono">
                        Resend in {otpCooldown}s
                      </span>
                    ) : otpSent ? (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-[11px] font-bold text-emerald-800 hover:underline"
                      >
                        Resend Now
                      </button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-6 gap-2 sm:gap-2.5 on-paste-handler" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                        className={`w-full aspect-square text-center text-xl sm:text-2xl font-mono font-black rounded-2xl border-2 transition-all ${
                          digit
                            ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-600/20'
                            : 'border-zinc-200 bg-zinc-50 text-zinc-900 focus:bg-white focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20'
                        }`}
                      />
                    ))}
                  </div>

                  {devOtpHint && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 flex items-center justify-between font-mono">
                      <span>SMS Code: <strong>{devOtpHint}</strong></span>
                      <button
                        type="button"
                        onClick={() => {
                          const digits = devOtpHint.split('').slice(0, 6)
                          setOtpDigits(digits)
                          verifyOtpCode(devOtpHint)
                        }}
                        className="text-xs font-bold text-amber-800 underline hover:text-amber-950"
                      >
                        Auto-fill
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-500 text-center pt-1">
                    Sent to owner phone <span className="font-bold text-zinc-800">+91 9908267125</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => verifyOtpCode()}
                  disabled={loading || otpDigits.includes('')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#005a36] via-[#00472b] to-[#003822] hover:from-[#00472b] hover:to-[#002717] text-white text-xs font-extrabold uppercase tracking-wider transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <span>Verify SMS OTP &amp; Log In &rarr;</span>
                  )}
                </button>
              </div>
            )}

            {/* Bottom Footer Info */}
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>256-Bit Encrypted Edge Session</span>
              </span>
              <span className="font-mono text-[10px]">
                Terminal 1 &bull; Active
              </span>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030d07] flex items-center justify-center text-emerald-400 font-mono text-xs">Initializing Terminal...</div>}>
      <LoginForm />
    </Suspense>
  )
}
