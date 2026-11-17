'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  IconLock,
  IconCheck,
  IconDownload,
  IconQr,
  IconPackage,
  IconReceipt,
} from '@/components/Icons'

export default function MainSystemSettingsPage() {
  const [pinCode, setPinCode] = useState('1234')
  const [isLocked, setIsLocked] = useState(false)
  const [telegramActive, setTelegramActive] = useState(false)
  const [chatId, setChatId] = useState('')
  const [testOtpStatus, setTestOtpStatus] = useState('')
  const [sendingTestOtp, setSendingTestOtp] = useState(false)
  const [rotatingPin, setRotatingPin] = useState(false)
  const [serverHost, setServerHost] = useState('localhost')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setServerHost(window.location.hostname || 'localhost')
    }

    // Fetch security & lock settings
    fetch('/api/security/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.lock) {
          setPinCode(d.lock.pinCode)
          setIsLocked(d.lock.isLocked)
        }
        if (d.telegram) {
          setTelegramActive(d.telegram.isActive)
          setChatId(d.telegram.chatId)
        }
      })
      .catch(() => { })
  }, [])

  // Send live test OTP
  const handleSendTestOtp = async () => {
    setSendingTestOtp(true)
    setTestOtpStatus('')
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: 'Main System Diagnostics Test',
          phoneOrUsername: 'Owner Phone',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setTestOtpStatus(
          data.telegramSent
            ? `OTP ${data.devCode} dispatched to owner Telegram!`
            : `Generated test code: ${data.devCode}`
        )
      } else {
        setTestOtpStatus(`Error: ${data.error}`)
      }
    } catch (e: any) {
      setTestOtpStatus(`Failed: ${e.message}`)
    } finally {
      setSendingTestOtp(false)
    }
  }

  // Rotate PIN immediately
  const handleRotatePin = async () => {
    if (!confirm('Generate a new random security PIN and send to Telegram?')) return
    setRotatingPin(true)
    try {
      const res = await fetch('/api/security/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotatePin: true }),
      })
      const data = await res.json()
      if (res.ok && data.lock) {
        setPinCode(data.lock.pinCode)
        alert(`New security PIN: ${data.lock.pinCode} (Dispatched to Telegram)`)
      }
    } catch {
      alert('Failed to rotate PIN')
    } finally {
      setRotatingPin(false)
    }
  }

  // Toggle terminal lock
  const handleToggleLock = async () => {
    const next = !isLocked
    try {
      await fetch('/api/security/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: next }),
      })
      setIsLocked(next)
      if (next) window.location.reload()
    } catch {
      alert('Could not update lock')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Main System Banner */}
      <div className="bg-gradient-to-r from-[#00472b] via-[#003822] to-[#002717] border-b-4 border-[#e5a919] p-6 rounded-2xl text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-36 h-14 bg-white rounded-xl p-1.5 shadow-sm flex items-center justify-center shrink-0">
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
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                Main System &bull; Host Master
              </span>
              <span className="text-xs text-emerald-200/80 font-mono">Terminal #1 Siddipet</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Main System &amp; Security Controls
            </h1>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              Central showroom infrastructure, OTP verification, database health, and payment standee.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/15 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white">System Online (Port 80/3000)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. OTP & Security Operations */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <IconLock className="w-4 h-4 text-emerald-800" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                OTP &amp; Remote Security
              </h2>
            </div>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
              Telegram Linked
            </span>
          </div>

          <p className="text-xs text-zinc-500">
            One-Time Passcodes and daily security PINs are dispatched instantly to the owner's phone via the connected Telegram bot.
          </p>

          {/* Current Daily PIN Card */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Current Terminal PIN
              </div>
              <div className="text-2xl font-mono font-bold text-zinc-900 tracking-wider mt-0.5">
                {pinCode}
              </div>
              <div className="text-[10px] text-zinc-500">Rotates automatically every morning</div>
            </div>
            <button
              type="button"
              disabled={rotatingPin}
              onClick={handleRotatePin}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold transition-colors"
            >
              {rotatingPin ? 'Rotating...' : 'Generate New PIN'}
            </button>
          </div>

          {/* Test OTP Trigger */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700">Test OTP Delivery</label>
              <button
                type="button"
                disabled={sendingTestOtp}
                onClick={handleSendTestOtp}
                className="px-3.5 py-1.5 rounded-xl bg-[#005a36] hover:bg-[#00472b] text-white text-xs font-bold transition-all shadow-2xs"
              >
                {sendingTestOtp ? 'Sending...' : 'Send Live OTP to Telegram'}
              </button>
            </div>
            {testOtpStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs rounded-xl font-medium">
                {testOtpStatus}
              </div>
            )}
          </div>

          {/* Remote Lock Control */}
          <div className="pt-2 border-t flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-zinc-800">Terminal Screen Lock</div>
              <div className="text-[11px] text-zinc-400">
                {isLocked ? 'Terminal is currently LOCKED' : 'Terminal is UNLOCKED & operating'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleLock}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${isLocked
                  ? 'bg-rose-50 border-rose-300 text-rose-800'
                  : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800'
                }`}
            >
              {isLocked ? 'Unlock Terminal' : 'Lock Terminal Now'}
            </button>
          </div>
        </div>

        {/* 2. Main System & Network Server Health */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
              Host Server &amp; Network Health
            </h2>
            <span className="text-[10px] font-mono bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md font-bold">
              Standalone Node.js
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500">Database Engine:</span>
              <strong className="font-mono text-zinc-900">MariaDB 10.4 (Port 3306)</strong>
            </div>

            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500">Production Web Proxy:</span>
              <strong className="font-mono text-zinc-900">Apache HTTP (Port 80)</strong>
            </div>

            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500">Next.js Core Runtime:</span>
              <strong className="font-mono text-zinc-900">Port 3000 (Active)</strong>
            </div>

            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500">Invoice Numbering:</span>
              <strong className="font-mono text-emerald-800">MF/2026/001 (Sequential)</strong>
            </div>

            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500">GST Computation:</span>
              <strong className="text-emerald-800 font-semibold">Exempt (0% CGST/SGST)</strong>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-zinc-500">Local LAN URL:</span>
              <strong className="font-mono text-zinc-800">http://{serverHost}:3000/</strong>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px] text-zinc-600">
            💡 <strong>Multi-Device Access:</strong> Tablets or mobile phones connected to the showroom Wi-Fi can access the POS register using your PC's IP address.
          </div>
        </div>

        {/* 3. Countertop Payment Standee & UPI */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <IconQr className="w-4 h-4 text-emerald-800" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                UPI &amp; Standee Details
              </h2>
            </div>
            <span className="text-[10px] font-bold text-amber-600 uppercase">Cashback Standee</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-20 h-28 bg-white border border-zinc-200 rounded-lg overflow-hidden shrink-0 shadow-xs">
              <Image
                src="/paytm-qr.jpg"
                alt="Paytm Standee"
                fill
                unoptimized
                className="object-cover"
              />
            </div>

            <div className="space-y-1 text-xs">
              <div className="font-bold text-zinc-900 text-sm">ALAKANTI SAI NITHIN</div>
              <div className="font-mono font-bold text-emerald-800">paytm.s36d65m@pty</div>
              <div className="text-[11px] text-zinc-500">
                Accepts Paytm, PhonePe, Google Pay, and BHIM UPI with zero merchant surcharge.
              </div>
              <a
                href="/paytm-qr.jpg"
                download="Paytm_Standee_Maruthi.jpg"
                className="inline-flex items-center gap-1 text-emerald-800 font-bold hover:underline pt-1 text-xs"
              >
                <IconDownload className="w-3.5 h-3.5" />
                <span>Download Standee Image</span>
              </a>
            </div>
          </div>
        </div>

        {/* 4. Complete Data Exports & Ledger Maintenance */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
              Data Exports &amp; Backup
            </h2>
            <span className="text-[10px] text-zinc-400">CSV Formats</span>
          </div>

          <p className="text-xs text-zinc-500">
            Export all showroom invoice transactions, customer khata ledgers, and inventory catalogs for offline accounting or backup.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href="/api/export?type=bills"
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors shadow-2xs"
            >
              <IconReceipt className="w-3.5 h-3.5 text-emerald-800" />
              <span>Export Invoices CSV</span>
            </a>

            <a
              href="/api/export?type=products"
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors shadow-2xs"
            >
              <IconPackage className="w-3.5 h-3.5 text-zinc-600" />
              <span>Export Products CSV</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
