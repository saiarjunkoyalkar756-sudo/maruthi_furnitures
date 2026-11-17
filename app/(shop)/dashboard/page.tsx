import Link from 'next/link'
import Image from 'next/image'
import { prisma } from '@/lib/db'
import {
  IconPlus,
  IconReceipt,
  IconPackage,
  IconUsers,
  IconDownload,
  IconArrowRight,
} from '@/components/Icons'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [totalBills, totalProducts, bills, lowStockProducts, products, expenses] =
    await Promise.all([
      prisma.bill.count(),
      prisma.product.count(),
      prisma.bill.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.product.findMany({
        where: {
          stock: { lte: 2 },
        },
        take: 6,
      }),
      prisma.product.findMany({
        select: {
          stock: true,
          wholesalePrice: true,
          retailPrice: true,
          costPrice: true,
          price: true,
        },
      }),
      prisma.expense.findMany({
        select: {
          amount: true,
        },
      }),
    ])

  // Aggregate bill stats
  const allBills = await prisma.bill.findMany({
    select: { total: true, amountPaid: true, status: true },
  })

  const totalRevenue = allBills.reduce((acc, b) => acc + (b.total || 0), 0)
  const totalCollected = allBills.reduce((acc, b) => acc + (b.amountPaid || 0), 0)
  const totalPending = allBills.reduce(
    (acc, b) => acc + ((b.total || 0) - (b.amountPaid || 0)),
    0
  )
  const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 100

  // Aggregate Inventory Values
  let totalWholesaleInventory = 0
  let totalRetailInventory = 0
  for (const p of products) {
    const stock = p.stock || 0
    const wp = p.wholesalePrice || p.costPrice || 0
    const rp = p.retailPrice || p.price || 0
    totalWholesaleInventory += wp * stock
    totalRetailInventory += rp * stock
  }
  const potentialInventoryProfit = totalRetailInventory - totalWholesaleInventory
  const potentialMarginPct =
    totalRetailInventory > 0 ? (potentialInventoryProfit / totalRetailInventory) * 100 : 0

  const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0)
  const netEarnings = totalCollected - totalExpenses

  return (
    <div className="space-y-6 pb-12">
      {/* Executive Showroom Master Banner with Brand Logo & UPI Standee */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#00472b] via-[#003822] to-[#002717] border-b-4 border-[#e5a919] p-6 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Logo & Store Identity */}
          <div className="flex items-center gap-5">
            <div className="relative w-40 h-16 bg-white rounded-xl p-1.5 shadow-md flex items-center justify-center shrink-0 border border-emerald-900/30">
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
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Siddipet Terminal #1 Active
                </span>
                <span className="text-[11px] text-emerald-200/80">GST Exempt &bull; Retail POS</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                MARUTHI FURNITURES &amp; MATTRESSES
              </h1>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Bypass Road, Beside RS Metro Garden, Siddipet - 502103 &bull; +91 9908267125
              </p>
            </div>
          </div>

          {/* Fast Actions */}
          <div className="flex items-center gap-3">
            {/* Main Primary POS Register Button */}
            <Link
              href="/billing/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#e5a919] hover:bg-[#d6980e] text-zinc-950 font-bold text-xs shadow-md transition-all transform hover:scale-[1.02]"
            >
              <IconPlus className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
              <span>+ New Sale (POS)</span>
            </Link>

            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs transition-colors border border-white/20"
            >
              <IconPackage className="w-3.5 h-3.5 text-emerald-200" />
              <span>Stock</span>
            </Link>

            <Link
              href="/api/export?type=bills"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs transition-colors border border-white/20"
              title="Export Sales Ledger to CSV"
            >
              <IconDownload className="w-3.5 h-3.5 text-emerald-200" />
              <span>CSV</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Gross Sales</span>
            <span className="font-mono text-[11px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
              {totalBills} bills
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-zinc-950 font-mono tracking-tight">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-zinc-100">
            <span className="text-emerald-700 font-semibold">₹{totalCollected.toLocaleString('en-IN')} received</span>
            <span className="text-zinc-400">{collectionRate.toFixed(0)}% paid</span>
          </div>
        </div>

        {/* Khata Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Khata Receivables</span>
            <span className="font-mono text-[11px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-bold">
              Credit
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-700 font-mono tracking-tight">
            ₹{totalPending.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-zinc-100">
            <span className="text-zinc-500">{(100 - collectionRate).toFixed(1)}% outstanding</span>
            <Link href="/customers" className="text-emerald-800 hover:text-emerald-950 font-bold hover:underline text-[11px] inline-flex items-center gap-1">
              <span>Settle Khata</span>
              <IconArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Catalog Inventory Worth */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Inventory Worth</span>
            <span className="font-mono text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md font-bold">
              {totalProducts} items
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-zinc-950 font-mono tracking-tight">
            ₹{totalRetailInventory.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-zinc-100">
            <span className={lowStockProducts.length > 0 ? 'text-amber-700 font-semibold' : 'text-zinc-500'}>
              {lowStockProducts.length > 0 ? `${lowStockProducts.length} low stock` : 'Stock healthy'}
            </span>
            <Link href="/products" className="text-emerald-800 hover:text-emerald-950 font-bold hover:underline text-[11px]">
              Manage &rarr;
            </Link>
          </div>
        </div>

        {/* Operating Expenses & Net Margin */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Shop Expenses</span>
            <span className="font-mono text-[11px] bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-md font-bold">
              Outflow
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold text-zinc-900 font-mono tracking-tight">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-zinc-100">
            <span className="text-zinc-500">Rent &amp; transport</span>
            <span className="text-emerald-800 font-semibold">Net: ₹{netEarnings.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Inventory & Margin Valuation Strip */}
      <div className="bg-white p-5 rounded-2xl border border-zinc-200/90 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Showroom Inventory Valuation &amp; Retail Margin Potential
            </div>
            <div className="text-xl font-bold text-zinc-950 font-mono mt-1">
              ₹{potentialInventoryProfit.toLocaleString('en-IN')}{' '}
              <span className="text-emerald-800 text-xs font-bold font-sans bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                +{potentialMarginPct.toFixed(1)}% Gross Margin
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Net margin potential between catalog selling prices and wholesale procurement costs.
            </p>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-zinc-200 pt-3 md:pt-0 md:pl-6 text-xs">
            <div>
              <div className="text-zinc-400 font-medium">Wholesale Stock Cost</div>
              <div className="text-sm font-bold font-mono text-zinc-900 mt-0.5">
                ₹{totalWholesaleInventory.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-zinc-400 font-medium">Retail Sales Valuation</div>
              <div className="text-sm font-bold font-mono text-emerald-800 mt-0.5">
                ₹{totalRetailInventory.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 text-xs">
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-bold text-amber-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Low Stock Notice: {lowStockProducts.length} items require replenishment (&le; 2 left)
            </span>
            <Link href="/products" className="font-bold text-amber-900 hover:underline">
              Add Inward Stock &rarr;
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.map((p) => (
              <span
                key={p.id}
                className="bg-white border border-amber-300 text-amber-950 px-2.5 py-1 rounded-lg text-xs font-medium shadow-2xs"
              >
                {p.name}: <strong className="font-mono text-amber-900">{p.stock}</strong> units left
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">Recent Showroom Invoices</h3>
            <p className="text-[11px] text-zinc-400">Sequential numbering format: MF/2026/001, MF/2026/002...</p>
          </div>
          <Link href="/billing" className="text-xs text-emerald-800 hover:text-emerald-950 font-bold hover:underline">
            View All Invoices &rarr;
          </Link>
        </div>

        {bills.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-xs">
            No transactions recorded yet. Click <strong>+ New Sale</strong> to create your first bill.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200/80 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3">Invoice</th>
                  <th className="text-left px-5 py-3">Customer</th>
                  <th className="text-left px-5 py-3">Date</th>
                  <th className="text-right px-5 py-3">Amount</th>
                  <th className="text-center px-5 py-3">Mode</th>
                  <th className="text-center px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {bills.map((bill) => {
                  const isPaid = bill.status === 'paid'
                  const isPartial = bill.status === 'partial'

                  return (
                    <tr key={bill.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-zinc-900">
                        {bill.billNumber}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-bold text-zinc-900">{bill.customerName}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">{bill.customerPhone || 'Counter sale'}</div>
                      </td>

                      <td className="px-5 py-3.5 text-zinc-500 whitespace-nowrap">
                        {new Date(bill.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-5 py-3.5 text-right font-mono font-bold text-zinc-950">
                        ₹{bill.total.toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-3.5 text-center uppercase text-[10px] text-zinc-600 font-medium">
                        {bill.paymentMode.replace('_', ' ')}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${isPaid
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isPartial
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-600' : isPartial ? 'bg-amber-600' : 'bg-rose-600'
                              }`}
                          />
                          <span>{bill.status}</span>
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/billing/${bill.id}`}
                          className="font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
                        >
                          Print / View &rarr;
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
