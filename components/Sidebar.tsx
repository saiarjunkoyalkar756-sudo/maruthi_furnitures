'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTheme } from './ThemeProvider'
import {
  IconDashboard,
  IconReceipt,
  IconPackage,
  IconUsers,
  IconWallet,
  IconChart,
  IconBroadcast,
  IconLock,
} from './Icons'

interface NavItem {
  href: string
  label: string
  icon: any
  isHighlight?: boolean
  badge?: string
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    group: 'Sales & Billing',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: IconDashboard },
      { href: '/billing/new', label: 'Point of Sale (POS)', icon: IconReceipt, isHighlight: true, badge: 'Quick' },
      { href: '/billing', label: 'Invoice Ledger', icon: IconReceipt },
    ],
  },
  {
    group: 'Stock & Ledger',
    items: [
      { href: '/products', label: 'Inventory & Stock', icon: IconPackage },
      { href: '/customers', label: 'Customer Khata', icon: IconUsers, badge: 'Credit' },
    ],
  },
  {
    group: 'Finance & Tools',
    items: [
      { href: '/expenses', label: 'Expenses & Margin', icon: IconWallet },
      { href: '/reports', label: 'Reports & P&L', icon: IconChart },
      { href: '/offers', label: 'WhatsApp Broadcast', icon: IconBroadcast },
      { href: '/settings', label: 'Main System', icon: IconLock, badge: 'Host' },
    ],
  },
]

export default function Sidebar() {
  const path = usePathname()
  const router = useRouter()
  const [locking, setLocking] = useState(false)

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (e) {
      console.error(e)
    }
    localStorage.removeItem('maruthi_user')
    document.cookie = 'maruthi_auth_token=; Max-Age=0; path=/;'
    document.cookie = 'maruthi_session=; Max-Age=0; path=/;'
    router.push('/login')
    router.refresh()
  }

  const handleQuickLock = async () => {
    if (!confirm('Lock POS terminal now?')) return
    setLocking(true)
    try {
      await fetch('/api/security/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked: true }),
      })
      window.location.reload()
    } catch {
      alert('Could not lock terminal')
    } finally {
      setLocking(false)
    }
  }

  return (
    <aside className="w-64 min-h-screen bg-white text-slate-700 flex flex-col fixed top-0 left-0 z-30 border-r border-slate-200/80 shadow-xs select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <Link href="/dashboard" className="block bg-white rounded-xl p-2.5 border border-slate-200/70 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="relative w-full h-12">
            <Image
              src="/logo.jpg"
              alt="Maruthi Furnitures"
              fill
              unoptimized
              className="object-contain"
              priority
            />
          </div>
        </Link>
        <div className="mt-2.5 flex items-center justify-between text-[11px] px-1">
          <span className="flex items-center gap-1.5 font-bold text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            POS Terminal Active
          </span>
          <span className="font-mono text-slate-500 text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
            Siddipet #1
          </span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
        {navGroups.map((grp) => (
          <div key={grp.group} className="space-y-1">
            <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {grp.group}
            </div>

            {grp.items.map((item) => {
              const Icon = item.icon
              const active =
                path === item.href ||
                (item.href !== '/dashboard' && path.startsWith(item.href) && item.href !== '/billing') ||
                (item.href === '/billing' && path === '/billing')

              if (item.isHighlight) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      backgroundColor: active ? 'var(--theme-primary)' : undefined,
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${active
                        ? 'text-white shadow-emerald-950/20'
                        : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100/80 border border-emerald-200/70'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-emerald-700'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${active ? 'bg-white/20 text-white' : 'bg-emerald-200/70 text-emerald-900'
                        }`}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    backgroundColor: active ? 'var(--theme-primary-dark, #0f172a)' : undefined,
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${active
                      ? 'text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${active ? 'text-emerald-300' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer Profile & Utility */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 min-w-0">
            <div
              style={{ backgroundColor: 'var(--theme-primary)' }}
              className="w-7 h-7 rounded-lg text-white flex items-center justify-center text-xs font-bold flex-shrink-0"
            >
              SN
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">Alakanti Sai Nithin</div>
              <div className="text-[10px] text-slate-500 truncate">Store Manager</div>
            </div>
          </div>
          <button
            onClick={handleQuickLock}
            disabled={locking}
            title="Lock POS Terminal"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
          >
            <IconLock className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 hover:border-rose-200 text-xs font-semibold transition-all shadow-2xs group"
          title="Sign out of POS Terminal"
        >
          <svg
            className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  )
}
