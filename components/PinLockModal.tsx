'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

export default function PinLockModal() {
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [pin, setPin] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [shake, setShake] = useState<boolean>(false)

  // Fetch lock status and poll Telegram updates
  const checkStatusAndPoll = useCallback(async () => {
    try {
      // 1. Poll Telegram bot updates in background
      fetch('/api/security/telegram/poll', { cache: 'no-store' }).catch(() => {})

      // 2. Fetch current terminal lock status
      const res = await fetch('/api/security/status', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (typeof data.isLocked === 'boolean') {
          setIsLocked((prev) => {
            // If it was just unlocked remotely, clear pin and error
            if (prev && !data.isLocked) {
              setPin('')
              setError('')
            }
            return data.isLocked
          })
        }
      }
    } catch {
      // Ignore network errors during polling
    }
  }, [])

  // Setup periodic polling interval (every 3 seconds)
  useEffect(() => {
    checkStatusAndPoll()
    const interval = setInterval(checkStatusAndPoll, 3000)
    return () => clearInterval(interval)
  }, [checkStatusAndPoll])

  // Handle PIN verification
  const handleVerify = async (pinToVerify?: string) => {
    const code = (pinToVerify !== undefined ? pinToVerify : pin).trim()
    if (!code) {
      setError('Please enter your security PIN')
      triggerShake()
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/security/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: code }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setIsLocked(false)
        setPin('')
        setError('')
      } else {
        setError(data.error || 'Incorrect PIN code!')
        triggerShake()
        setPin('')
      }
    } catch {
      setError('Unable to verify PIN. Check database connection.')
      triggerShake()
    } finally {
      setIsSubmitting(false)
    }
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const handleDigit = (digit: string) => {
    if (pin.length >= 8) return
    setError('')
    const nextPin = pin + digit
    setPin(nextPin)
  }

  const handleBackspace = () => {
    setError('')
    setPin((prev) => prev.slice(0, -1))
  }

  const handleClear = () => {
    setError('')
    setPin('')
  }

  // Physical keyboard support
  useEffect(() => {
    if (!isLocked) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        handleDigit(e.key)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        handleBackspace()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        handleVerify()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleClear()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLocked, pin])

  if (!isLocked) return null

  return (
    <div className="fixed inset-0 z-50 bg-[#081510]/95 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div
        className={`w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-900/30 transition-transform ${
          shake ? 'animate-bounce' : ''
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#112a20] via-[#1b4332] to-[#2d6a4f] text-white p-6 text-center relative">
          <div className="w-36 h-14 mx-auto relative mb-3 bg-white/95 rounded-xl p-2 shadow-inner">
            <Image
              src="/logo.jpg"
              alt="Maruthi Furnitures"
              fill
              unoptimized
              className="object-contain p-1"
              priority
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold uppercase tracking-wider mb-1 border border-rose-500/30">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            Terminal Locked
          </div>
          <h2 className="text-lg font-bold text-white">Enter Security PIN</h2>
          <p className="text-xs text-emerald-200/80 mt-1">
            Unlock via keypad or send <span className="font-mono text-amber-300">/unlock</span> via Telegram
          </p>
        </div>

        {/* PIN Display Dots */}
        <div className="px-6 pt-5 pb-2 text-center">
          <div className="h-12 flex items-center justify-center gap-3">
            {[0, 1, 2, 3].map((idx) => {
              const filled = idx < pin.length
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    filled
                      ? 'bg-emerald-600 scale-125 shadow-md shadow-emerald-500/40'
                      : 'border-2 border-gray-300 bg-gray-100'
                  }`}
                />
              )
            })}
            {pin.length > 4 && (
              <span className="text-xs text-emerald-700 font-bold ml-1">
                +{pin.length - 4}
              </span>
            )}
          </div>

          {/* Error Message */}
          {error ? (
            <p className="text-xs text-rose-600 font-semibold mt-1 min-h-[18px]">
              {error}
            </p>
          ) : (
            <p className="text-xs text-gray-400 mt-1 min-h-[18px]">
              Type on keyboard or use keypad below
            </p>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="p-6 pt-2">
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className="h-14 rounded-2xl bg-gray-50 hover:bg-emerald-50 active:bg-emerald-100 border border-gray-200 text-xl font-bold text-gray-800 hover:text-emerald-800 hover:border-emerald-300 transition-all shadow-sm active:scale-95 flex items-center justify-center"
              >
                {digit}
              </button>
            ))}

            {/* Clear Button */}
            <button
              type="button"
              onClick={handleClear}
              className="h-14 rounded-2xl bg-gray-100 hover:bg-rose-50 active:bg-rose-100 border border-gray-200 text-xs font-bold text-gray-600 hover:text-rose-700 hover:border-rose-300 transition-all shadow-sm active:scale-95 flex flex-col items-center justify-center"
            >
              <span>CLEAR</span>
            </button>

            {/* 0 Button */}
            <button
              type="button"
              onClick={() => handleDigit('0')}
              className="h-14 rounded-2xl bg-gray-50 hover:bg-emerald-50 active:bg-emerald-100 border border-gray-200 text-xl font-bold text-gray-800 hover:text-emerald-800 hover:border-emerald-300 transition-all shadow-sm active:scale-95 flex items-center justify-center"
            >
              0
            </button>

            {/* Backspace Button */}
            <button
              type="button"
              onClick={handleBackspace}
              className="h-14 rounded-2xl bg-gray-100 hover:bg-amber-50 active:bg-amber-100 border border-gray-200 text-xl font-bold text-gray-700 hover:text-amber-800 hover:border-amber-300 transition-all shadow-sm active:scale-95 flex items-center justify-center"
              title="Backspace"
            >
              ⌫
            </button>
          </div>

          {/* Unlock Submit Button */}
          <button
            type="button"
            disabled={isSubmitting || pin.length === 0}
            onClick={() => handleVerify()}
            className="w-full mt-4 h-13 py-3 rounded-2xl bg-[#2d6a4f] hover:bg-[#1b4332] active:bg-[#112a20] text-white font-bold text-sm tracking-wide shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span>Verifying...</span>
            ) : (
              <>
                <span>🔓</span>
                <span>UNLOCK TERMINAL</span>
              </>
            )}
          </button>
        </div>

        {/* Footer info */}
        <div className="bg-gray-50 px-6 py-2.5 border-t border-gray-100 text-center text-[11px] text-gray-500">
          Maruthi Furnitures • Bypass Rd, Siddipet
        </div>
      </div>
    </div>
  )
}

