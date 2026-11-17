'use client'
import React, { createContext, useContext, useState, useEffect } from 'react'

export type ThemeId = 'emerald' | 'forest' | 'mint' | 'slate' | 'gold'

export interface ThemeOption {
  id: ThemeId
  name: string
  color: string
  accent: string
  badge: string
}

export const THEMES: ThemeOption[] = [
  { id: 'emerald', name: 'Emerald Green', color: '#005a36', accent: '#e5a919', badge: 'Brand Default' },
  { id: 'forest', name: 'Forest Pine', color: '#064e3b', accent: '#f59e0b', badge: 'Deep Green' },
  { id: 'mint', name: 'Vibrant Mint', color: '#15803d', accent: '#eab308', badge: 'Fresh Green' },
  { id: 'slate', name: 'Executive Slate', color: '#1e293b', accent: '#0ea5e9', badge: 'Modern Dark' },
  { id: 'gold', name: 'Royal Teak', color: '#92400e', accent: '#d97706', badge: 'Wood Accent' },
]

interface ThemeContextType {
  theme: ThemeId
  setTheme: (t: ThemeId) => void
  themeInfo: ThemeOption
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'emerald',
  setTheme: () => {},
  themeInfo: THEMES[0],
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>('emerald')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('maruthi_theme') as ThemeId
    if (saved && THEMES.some((t) => t.id === saved)) {
      setThemeState(saved)
      document.documentElement.setAttribute('data-theme', saved)
    } else {
      document.documentElement.setAttribute('data-theme', 'emerald')
    }
    setMounted(true)
  }, [])

  const setTheme = (t: ThemeId) => {
    setThemeState(t)
    localStorage.setItem('maruthi_theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  const themeInfo = THEMES.find((t) => t.id === theme) || THEMES[0]

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeInfo }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
