import { prisma } from '@/lib/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const [bills, billItems, expenses, products] = await Promise.all([
    prisma.bill.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    }),
    prisma.billItem.findMany(),
    prisma.expense.findMany(),
    prisma.product.findMany(),
  ])

  // Financial aggregates
  const totalRevenue = bills.reduce((sum, b) => sum + (b.total || 0), 0)
  const totalSubtotal = bills.reduce((sum, b) => sum + (b.subtotal || 0), 0)
  const totalDiscount = bills.reduce((sum, b) => sum + (b.discount || 0), 0)
  const totalTax = 0
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

  // COGS
  const totalCOGS = billItems.reduce((sum, item) => {
    return sum + (item.costPrice > 0 ? item.costPrice * item.qty : item.price * item.qty * 0.65)
  }, 0)

  const grossProfit = totalRevenue - totalCOGS
  const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const netProfit = grossProfit - totalExpenses
  const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  // Category distribution from products
  const categoryCount: Record<string, { count: number; wholesaleVal: number; retailVal: number }> = {}
  for (const p of products) {
    if (!categoryCount[p.category]) {
      categoryCount[p.category] = { count: 0, wholesaleVal: 0, retailVal: 0 }
    }
    const stock = p.stock || 0
    const wp = p.wholesalePrice || p.costPrice || 0
    const rp = p.retailPrice || p.price || 0
    categoryCount[p.category].count += stock
    categoryCount[p.category].wholesaleVal += wp * stock
    categoryCount[p.category].retailVal += rp * stock
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Business Reports &amp; Financial Analytics</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              P&amp;L Analysis
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gross margins, cost of goods sold, category turnover &amp; shop net profit
          </p>
        </div>
        <Link
          href="/expenses"
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all self-start"
        >
          <span>💰</span>
          <span>View Expenses</span>
        </Link>
      </div>

      {/* High-Level P&L Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b pb-2">
          Profit &amp; Loss Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-500 uppercase font-semibold">Total Sales Revenue</div>
            <div className="text-xl font-extrabold text-blue-900 mt-1 font-mono">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-500 uppercase font-semibold">Wholesale Cost (COGS)</div>
            <div className="text-xl font-extrabold text-amber-700 mt-1 font-mono">
              ₹{totalCOGS.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-500 uppercase font-semibold">Gross Margin</div>
            <div className="text-xl font-extrabold text-emerald-600 mt-1 font-mono">
              {grossMarginPct.toFixed(1)}%
            </div>
            <div className="text-xs text-emerald-700 mt-0.5">₹{grossProfit.toLocaleString('en-IN')}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="text-xs text-gray-500 uppercase font-semibold">Net Profit Margin</div>
            <div className="text-xl font-extrabold text-indigo-700 mt-1 font-mono">
              {netMarginPct.toFixed(1)}%
            </div>
            <div className="text-xs text-indigo-700 mt-0.5">₹{netProfit.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Category Margins Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-bold text-gray-900">Inventory Category Margins &amp; Valuation</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
            <tr>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-center px-4 py-3">In-Stock Units</th>
              <th className="text-right px-4 py-3">Wholesale Value (₹)</th>
              <th className="text-right px-4 py-3">Retail Value (₹)</th>
              <th className="text-right px-4 py-3">Potential Profit (₹)</th>
              <th className="text-right px-4 py-3">Expected Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Object.entries(categoryCount).map(([cat, val]) => {
              const profit = val.retailVal - val.wholesaleVal
              const margin = val.retailVal > 0 ? (profit / val.retailVal) * 100 : 0
              return (
                <tr key={cat} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-gray-900">{cat}</td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700">{val.count}</td>
                  <td className="px-4 py-3 text-right font-mono text-amber-900">
                    ₹{val.wholesaleVal.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-blue-900">
                    ₹{val.retailVal.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                    +₹{profit.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {margin.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

