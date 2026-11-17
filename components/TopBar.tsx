'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconPlus, IconReceipt } from './Icons'
import { useTheme, THEMES, ThemeId } from './ThemeProvider'

export default function TopBar() {
  const pathname = usePathname()
  const { theme, setTheme, themeInfo } = useTheme()
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const [time, setTime] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      )
      setDate(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowThemeMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getPageTitle = (p: string) => {
    if (p === '/dashboard') return 'Dashboard Overview'
    if (p.startsWith('/billing/new')) return 'Point of Sale (POS Register)'
    if (p.startsWith('/billing')) return 'Invoices & Ledger'
    if (p.startsWith('/products')) return 'Inventory & Stock Catalog'
    if (p.startsWith('/customers')) return 'Customer Khata Ledger'
    if (p.startsWith('/expenses')) return 'Shop Expenses & Margin'
    if (p.startsWith('/reports')) return 'Business Reports & P&L'
    if (p.startsWith('/offers')) return 'WhatsApp Offers & Broadcast'
    return 'Maruthi Furnitures'
  }

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-zinc-200/90 px-6 py-2.5 flex items-center justify-between select-none">
      {/* Page Title & Branch */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-bold text-zinc-900 tracking-tight">
          {getPageTitle(pathname)}
        </h1>
        <span className="text-[10px] font-mono font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">
          Siddipet Flagship
        </span>
      </div>

      {/* Right Controls: Theme Switcher, Clock & New Sale */}
      <div className="flex items-center gap-3">
        {/* Live IST Clock */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-500 font-mono bg-zinc-50 px-3 py-1 rounded-full border border-zinc-200/70">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{date}</span>
          <span>&bull;</span>
          <span className="font-semibold text-zinc-800">{time}</span>
        </div>

        {/* Theme Switcher Pill & Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-colors"
            title="Switch Software Theme Color"
          >
            <span
              className="w-3 h-3 rounded-full border border-black/10 shadow-2xs shrink-0"
              style={{ backgroundColor: themeInfo.color }}
            />
            <span className="hidden sm:inline text-zinc-800">{themeInfo.name}</span>
            <svg
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${showThemeMenu ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Theme Dropdown Menu */}
          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-zinc-200 p-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-2 border-b border-zinc-100">
                <div className="text-[11px] font-bold text-zinc-900 uppercase tracking-wider">
                  Software Theme Color
                </div>
                <div className="text-[10px] text-zinc-400">Choose your showroom visual style</div>
              </div>

              <div className="space-y-1 py-1.5">
                {THEMES.map((t) => {
                  const isSelected = theme === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTheme(t.id)
                        setShowThemeMenu(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                        isSelected
                          ? 'bg-zinc-100 font-bold text-zinc-950'
                          : 'hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shadow-2xs shrink-0"
                          style={{ backgroundColor: t.color }}
                        />
                        <div>
                          <div className="text-xs font-semibold leading-tight">{t.name}</div>
                          <div className="text-[10px] text-zinc-400">{t.badge}</div>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick + New Sale POS shortcut */}
        {pathname !== '/billing/new' && (
          <Link
            href="/billing/new"
            className="flex items-center gap-1.5 bg-[#005a36] hover:bg-[#00472b] text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-2xs hover:shadow-xs"
          >
            <IconPlus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Sale</span>
          </Link>
        )}
      </div>
    </header>
  )
}
