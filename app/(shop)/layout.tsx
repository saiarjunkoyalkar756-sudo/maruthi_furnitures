import Sidebar from '@/components/Sidebar'
import PinLockModal from '@/components/PinLockModal'
import TopBar from '@/components/TopBar'
import { ThemeProvider } from '@/components/ThemeProvider'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-[#f6f8f7] text-slate-900 font-sans antialiased">
        <PinLockModal />
        <Sidebar />
        <div className="flex-1 ml-64 flex flex-col min-h-screen">
          <TopBar />
          <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}
