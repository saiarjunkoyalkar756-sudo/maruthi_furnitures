'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

function LoginView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextDestination = searchParams.get('next') || '/dashboard'

  // Auth Method: 'password' | 'otp'
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password')

  // Password Login State
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Mobile SMS OTP State
  const [phone, setPhone] = useState('')
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [otpSent, setOtpSent] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [gatewayMessage, setGatewayMessage] = useState('')
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // UI Feedback States
  const [loading, setLoading] = useState(false)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Cooldown countdown timer
  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setInterval(() => {
      setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCooldown])

  // --- Password Login Handler ---
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.')
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
        throw new Error(data.error || 'Invalid credentials. Please verify and try again.')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('maruthi_user', JSON.stringify(data.user))
      }

      setSuccessMessage(`Welcome back, ${data.user.name || 'Store Manager'}!`)
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

    if (!phone.trim()) {
      setErrorMessage('Please enter your registered phone number.')
      return
    }

    setSendingOtp(true)

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          purpose: 'Showroom POS Terminal Login',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch SMS OTP.')
      }

      setOtpSent(true)
      setOtpCooldown(60)
      setGatewayMessage(data.message || 'SMS OTP dispatched to registered phone.')
      setSuccessMessage(`OTP sent via SMS to ${phone}!`)

      // Focus first OTP digit input
      setTimeout(() => {
        otpInputRefs.current[0]?.focus()
      }, 100)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error sending OTP.')
    } finally {
      setSendingOtp(false)
    }
  }

  // --- OTP Digit Input Handler ---
  const handleOtpDigitChange = (index: number, val: string) => {
    if (val.length > 1) {
      const digits = val.replace(/\D/g, '').slice(0, 6).split('')
      const nextOtp = [...otpDigits]
      digits.forEach((d, i) => {
        if (index + i < 6) nextOtp[index + i] = d
      })
      setOtpDigits(nextOtp)
      const targetFocus = Math.min(index + digits.length, 5)
      otpInputRefs.current[targetFocus]?.focus()
      if (nextOtp.every((d) => d !== '')) {
        verifyOtpCode(nextOtp.join(''))
      }
      return
    }

    const digit = val.replace(/\D/g, '')
    const nextOtp = [...otpDigits]
    nextOtp[index] = digit
    setOtpDigits(nextOtp)

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }

    if (nextOtp.every((d) => d !== '')) {
      verifyOtpCode(nextOtp.join(''))
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
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
          phoneOrUsername: phone.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Invalid or expired OTP code.')
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('maruthi_user', JSON.stringify(data.user))
      }

      setSuccessMessage('OTP Verified! Opening terminal...')
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
    <div className="relative min-h-screen bg-[#dce5ef] flex items-center justify-center p-4 sm:p-8 font-sans overflow-hidden selection:bg-indigo-500 selection:text-white">

      {/* ================= BACKGROUND GEOMETRIC SHAPES (AS SEEN IN REFERENCE) ================= */}
      {/* Top Left Angle Shape */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#cddae9] rounded-[4rem] rotate-12 pointer-events-none" />
      {/* Top Right Curved Angle Shape */}
      <div className="absolute -top-32 right-12 w-80 h-80 bg-[#c5d5e6] rounded-[5rem] -rotate-45 pointer-events-none" />
      {/* Bottom Left Triangular / Polygon Angle */}
      <div className="absolute -bottom-28 -left-20 w-[28rem] h-[28rem] bg-[#cddae9] rounded-[4.5rem] rotate-45 pointer-events-none" />
      {/* Bottom Right Shape */}
      <div className="absolute -bottom-36 -right-28 w-[32rem] h-[32rem] bg-[#c5d5e6] rounded-[5rem] -rotate-12 pointer-events-none" />

      {/* ================= MAIN WHITE FLOATING CARD ================= */}
      <div className="relative z-10 w-full max-w-5xl bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(50,70,100,0.25)] border border-white/60 p-6 sm:p-12 transition-all">

        {/* ================= TOP NAVIGATION BAR ================= */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 sm:pb-12">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 bg-white rounded-xl shadow-xs border border-slate-200 p-1 flex items-center justify-center">
              <Image
                src="/logo.jpg"
                alt="Maruthi Furnitures Logo"
                fill
                unoptimized
                className="object-contain p-0.5"
                priority
              />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black tracking-tight text-[#1e293b]">
                Maruthi Furnitures
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Siddipet Flagship &bull; EST. 2010
              </div>
            </div>
          </div>

          {/* Nav Links (Matching reference: Home, Profil, About, Portfolio, Contact) */}
          <nav className="flex items-center gap-5 sm:gap-7 text-xs font-semibold text-slate-400">
            <span className="text-[#5063f0] hover:text-indigo-700 cursor-pointer transition-colors">
              Home
            </span>
            <span className="hover:text-slate-700 cursor-pointer transition-colors">
              Features
            </span>
            <span className="hover:text-slate-700 cursor-pointer transition-colors">
              Catalog
            </span>
            <span className="hover:text-slate-700 cursor-pointer transition-colors">
              Showroom
            </span>
            <a
              href="tel:+919908267125"
              className="hover:text-slate-700 transition-colors hidden md:inline"
            >
              Contact
            </a>
          </nav>
        </header>

        {/* ================= TWO-COLUMN GRID LAYOUT ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* ----------------- LEFT COLUMN: LOGIN FORM ----------------- */}
          <div className="lg:col-span-6 space-y-7 pr-0 lg:pr-4">

            {/* WELCOME HEADING */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#5063f0] tracking-widest uppercase">
                WELCOME
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Enter your terminal credentials to access the showroom POS
              </p>
            </div>

            {/* Notification Messages */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-shake">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                {successMessage}
              </div>
            )}

            {/* Auth Mode Toggle Pill */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-500">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('password')
                  setErrorMessage('')
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  authMethod === 'password'
                    ? 'bg-white text-[#5063f0] shadow-xs'
                    : 'hover:text-slate-800'
                }`}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('otp')
                  setErrorMessage('')
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  authMethod === 'otp'
                    ? 'bg-white text-[#5063f0] shadow-xs'
                    : 'hover:text-slate-800'
                }`}
              >
                Mobile SMS OTP
              </button>
            </div>

            {/* PASSWORD LOGIN FORM */}
            {authMethod === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="space-y-6">

                {/* Username Input with Clean Underline (Matching Reference) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="xxxxxxxxxxxxxxx"
                    required
                    className="w-full bg-transparent border-b-2 border-slate-300 focus:border-[#5063f0] py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
                  />
                </div>

                {/* Password Input with Clean Underline (Matching Reference) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full bg-transparent border-b-2 border-slate-300 focus:border-[#5063f0] py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
                  />
                </div>

                {/* Remember & Forgot Row (Matching Reference) */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-[#5063f0] border-slate-300 focus:ring-0 cursor-pointer"
                    />
                    <span className="font-medium text-slate-600">Remember</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setAuthMethod('otp')}
                    className="font-medium text-slate-500 hover:text-[#5063f0] transition-colors"
                  >
                    Forgot Password ?
                  </button>
                </div>

                {/* SUBMIT BUTTON (Vibrant Golden-Yellow, as in reference) */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto min-w-[180px] bg-[#fec832] hover:bg-[#fabf1d] active:bg-[#f5b80e] text-white font-extrabold text-xs uppercase tracking-widest py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 disabled:opacity-50"
                  >
                    {loading ? 'SUBMITTING...' : 'SUBMIT'}
                  </button>
                </div>

              </form>
            ) : (
              /* MOBILE SMS OTP FORM */
              <div className="space-y-6">

                {/* Phone Number Input */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 tracking-wider">
                    Mobile Phone (Cellular SMS OTP)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter registered mobile number"
                      className="flex-1 bg-transparent border-b-2 border-slate-300 focus:border-[#5063f0] py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || otpCooldown > 0}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {sendingOtp ? 'Sending...' : otpCooldown > 0 ? `${otpCooldown}s` : 'Send OTP'}
                    </button>
                  </div>
                  {gatewayMessage && (
                    <p className="text-[11px] text-slate-400 pt-1 font-mono">
                      {gatewayMessage}
                    </p>
                  )}
                </div>

                {/* 6-Digit OTP Input Boxes */}
                {otpSent && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 tracking-wider">
                      Enter 6-Digit SMS OTP
                    </label>
                    <div className="flex gap-2 justify-between">
                      {otpDigits.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => {
                            otpInputRefs.current[i] = el
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="w-11 h-12 text-center text-lg font-bold text-slate-800 bg-slate-50 border-2 border-slate-200 focus:border-[#5063f0] focus:bg-white rounded-xl outline-none transition-all"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* SUBMIT BUTTON */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => verifyOtpCode()}
                    disabled={loading || !otpSent}
                    className="w-full sm:w-auto min-w-[180px] bg-[#fec832] hover:bg-[#fabf1d] active:bg-[#f5b80e] text-white font-extrabold text-xs uppercase tracking-widest py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 disabled:opacity-50"
                  >
                    {loading ? 'VERIFYING...' : 'SUBMIT OTP'}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthMethod('password')}
                    className="text-xs font-semibold text-slate-400 hover:text-[#5063f0] transition-colors"
                  >
                    &larr; Back to Username &amp; Password
                  </button>
                </div>

              </div>
            )}

          </div>

          {/* ----------------- RIGHT COLUMN: VECTOR ILLUSTRATION (AS IN REFERENCE) ----------------- */}
          <div className="lg:col-span-6 flex items-center justify-center relative p-4">

            {/* Custom SVG Illustration exactly mirroring the user's reference mockup */}
            <svg
              viewBox="0 0 520 460"
              className="w-full max-w-[460px] h-auto drop-shadow-sm select-none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Central Indigo/Purple Circular Backdrop */}
              <circle cx="280" cy="230" r="160" fill="#6979f8" />

              {/* Atmospheric Soft Clouds inside circle */}
              <path
                d="M210 180c0-10 8-18 18-18 4 0 7 1 10 3 4-8 12-14 22-14 13 0 24 10 24 23 3 1 6 4 7 8 2 5 1 10-2 14-3 4-8 6-13 6h-60c-3 0-6-1-8-4-4-4-5-9-4-14 1-5 4-8 6-10z"
                fill="#ffffff"
                fillOpacity="0.25"
              />
              <path
                d="M320 270c0-8 6-14 14-14 3 0 6 1 8 3 3-6 9-11 17-11 10 0 19 8 19 18 2 1 5 3 6 6 1 4 0 8-2 11-2 3-6 5-10 5h-48c-3 0-5-1-6-3-3-3-4-7-3-11 1-4 3-6 5-8z"
                fill="#ffffff"
                fillOpacity="0.2"
              />

              {/* Floating Security Badge 1: Gear / Settings */}
              <g transform="translate(180, 100)">
                <circle cx="16" cy="16" r="16" fill="#e2e8f0" fillOpacity="0.9" />
                <path
                  d="M16 11a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z"
                  fill="#94a3b8"
                />
                <circle cx="16" cy="8" r="1.5" fill="#94a3b8" />
                <circle cx="16" cy="24" r="1.5" fill="#94a3b8" />
                <circle cx="8" cy="16" r="1.5" fill="#94a3b8" />
                <circle cx="24" cy="16" r="1.5" fill="#94a3b8" />
              </g>

              {/* Floating Security Badge 2: Key (Top Right) */}
              <g transform="translate(370, 110)">
                <circle cx="10" cy="10" r="8" stroke="#cbd5e1" strokeWidth="3" fill="none" />
                <rect x="18" y="8.5" width="22" height="3" rx="1.5" fill="#cbd5e1" />
                <rect x="32" y="11" width="3" height="5" rx="1" fill="#cbd5e1" />
                <rect x="37" y="11" width="3" height="4" rx="1" fill="#cbd5e1" />
              </g>

              {/* Floating Checkmark Badges around circle */}
              <g transform="translate(160, 160)">
                <circle cx="8" cy="8" r="8" fill="#e2e8f0" />
                <path d="M5 8l2 2 4-4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
              </g>
              <g transform="translate(425, 220)">
                <circle cx="8" cy="8" r="8" fill="#e2e8f0" />
                <path d="M5 8l2 2 4-4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
              </g>
              <g transform="translate(200, 270)">
                <circle cx="8" cy="8" r="8" fill="#e2e8f0" />
                <path d="M5 8l2 2 4-4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* Floating Gear 2 (Lower Right) */}
              <g transform="translate(415, 280)">
                <circle cx="14" cy="14" r="14" fill="#e2e8f0" fillOpacity="0.8" />
                <circle cx="14" cy="14" r="5" fill="#94a3b8" />
              </g>

              {/* Floating Padlock Badge (Lower Left) */}
              <g transform="translate(160, 290)">
                <rect x="2" y="8" width="16" height="12" rx="3" fill="#cbd5e1" />
                <path d="M6 8V5a4 4 0 018 0v3" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
              </g>

              {/* Floating Credential Chips beside the phone (Left side of phone) */}
              {/* Chip 1: Username pill */}
              <g transform="translate(150, 190)">
                <rect width="70" height="18" rx="4" fill="#1e3a8a" />
                <circle cx="10" cy="9" r="4" fill="#93c5fd" />
                <rect x="20" y="8" width="40" height="2" rx="1" fill="#ffffff" fillOpacity="0.8" />
              </g>
              {/* Chip 2: Password pill */}
              <g transform="translate(150, 215)">
                <rect width="70" height="18" rx="4" fill="#1e3a8a" />
                <rect x="7" y="7" width="6" height="5" rx="1" fill="#93c5fd" />
                <circle cx="24" cy="9" r="1.5" fill="#ffffff" />
                <circle cx="31" cy="9" r="1.5" fill="#ffffff" />
                <circle cx="38" cy="9" r="1.5" fill="#ffffff" />
                <circle cx="45" cy="9" r="1.5" fill="#ffffff" />
                <circle cx="52" cy="9" r="1.5" fill="#ffffff" />
              </g>

              {/* ================= THE STYLIZED GOLDEN SMARTPHONE ================= */}
              {/* Outer Phone Bezel / Frame */}
              <g transform="translate(230, 180)">
                {/* Phone Body with Navy Shadow and Border */}
                <rect
                  x="0"
                  y="0"
                  width="100"
                  height="190"
                  rx="14"
                  fill="#0f172a"
                  filter="drop-shadow(0 15px 25px rgba(15,23,42,0.25))"
                />

                {/* Top Speaker Ear Notch */}
                <rect x="40" y="5" width="20" height="2.5" rx="1.25" fill="#334155" />

                {/* Screen Display (Golden Yellow) */}
                <rect x="3" y="12" width="94" height="165" fill="#fed246" />

                {/* Inside Screen: User Avatar Circle */}
                <circle cx="50" cy="50" r="22" fill="#ffffff" />
                <circle cx="50" cy="50" r="19" stroke="#f59e0b" strokeWidth="2.5" fill="#ffffff" />
                <circle cx="50" cy="44" r="7" fill="#1e3a8a" />
                <path
                  d="M39 58c0-5 5-8 11-8s11 3 11 8"
                  fill="#1e3a8a"
                />

                {/* Inside Screen: Form Inputs with Masked Dots */}
                {/* Input 1 */}
                <rect x="15" y="85" width="70" height="9" rx="2" fill="#ffffff" />
                <circle cx="28" cy="89.5" r="1.2" fill="#1e3a8a" />
                <circle cx="36" cy="89.5" r="1.2" fill="#1e3a8a" />
                <circle cx="44" cy="89.5" r="1.2" fill="#1e3a8a" />
                <circle cx="52" cy="89.5" r="1.2" fill="#1e3a8a" />
                <circle cx="60" cy="89.5" r="1.2" fill="#1e3a8a" />

                {/* Input 2 */}
                <rect x="15" y="102" width="70" height="9" rx="2" fill="#ffffff" />
                <circle cx="24" cy="106.5" r="1.2" fill="#1e3a8a" />
                <circle cx="32" cy="106.5" r="1.2" fill="#1e3a8a" />
                <circle cx="40" cy="106.5" r="1.2" fill="#1e3a8a" />
                <circle cx="48" cy="106.5" r="1.2" fill="#1e3a8a" />
                <circle cx="56" cy="106.5" r="1.2" fill="#1e3a8a" />
                <circle cx="64" cy="106.5" r="1.2" fill="#1e3a8a" />

                {/* Inside Screen: Blue Submit Bar */}
                <rect x="15" y="122" width="70" height="10" rx="2" fill="#1e3a8a" />

                {/* Bottom Home Indicator Bar */}
                <rect x="42" y="181" width="16" height="3" rx="1.5" fill="#334155" />
              </g>

              {/* ================= THE CHARACTER FIGURE (AS IN REFERENCE) ================= */}
              <g transform="translate(320, 230)">
                {/* Head & Hair */}
                <circle cx="30" cy="12" r="8" fill="#fed7aa" />
                {/* Dark Hair */}
                <path d="M22 10c0-6 4-9 10-9 5 0 9 3 9 7 0 2-2 4-4 4h-12c-2 0-3-1-3-2z" fill="#0f172a" />

                {/* Neck */}
                <rect x="28" y="19" width="4" height="4" fill="#fed7aa" />

                {/* Yellow T-Shirt Torso */}
                <path d="M20 23h20l-2 38h-16z" fill="#fed246" />

                {/* Left Arm Raised Touching the Phone Screen */}
                <path
                  d="M20 25L-5 12"
                  stroke="#fed7aa"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                {/* Yellow short sleeve */}
                <path d="M22 23L12 28" stroke="#fed246" strokeWidth="6" strokeLinecap="round" />

                {/* Right Arm hanging straight */}
                <path
                  d="M40 25l4 28"
                  stroke="#fed7aa"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                />
                <path d="M39 23l3 10" stroke="#fed246" strokeWidth="6" strokeLinecap="round" />

                {/* Dark Blue Trousers */}
                <path d="M22 61h16l2 45h-6l-2-28-2 28h-6z" fill="#1e3a8a" />

                {/* Left Shoe */}
                <path d="M22 106h8v4h-10a2 2 0 012-4z" fill="#0f172a" />
                {/* Right Shoe */}
                <path d="M34 106h8v4h-10a2 2 0 012-4z" fill="#0f172a" />
              </g>

              {/* Base Decorative Leaves / Foliage */}
              <g transform="translate(195, 335)" fill="#e2e8f0">
                <path d="M10 35c-5-15 0-30 15-35-2 15-8 28-15 35z" />
                <path d="M25 35c0-18 8-28 22-30-5 15-12 26-22 30z" fillOpacity="0.8" />
                <path d="M38 35c5-12 15-20 25-20-4 12-14 18-25 20z" fillOpacity="0.6" />
              </g>

            </svg>

          </div>

        </div>

      </div>

    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#dce5ef] flex items-center justify-center text-slate-600 font-bold">
          Loading Showroom Portal...
        </div>
      }
    >
      <LoginView />
    </Suspense>
  )
}
