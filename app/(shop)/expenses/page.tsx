'use client'
import { useEffect, useState, useMemo } from 'react'

interface Expense {
  id: number
  category: string
  amount: number
  note: string
  date: string
  createdAt: string
}

interface Financials {
  totalSales: number
  totalCOGS: number
  grossProfit: number
  grossMarginPercent: number
  totalExpenses: number
  netProfit: number
  overallMarginPercent: number
}

const EXPENSE_CATEGORIES = [
  'Shop Rent',
  'Electricity',
  'Freight & Transport',
  'Hamali & Labor',
  'Tea & Refreshments',
  'Staff Salary',
  'Shop Maintenance',
  'Packaging & Delivery',
  'Miscellaneous',
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [financials, setFinancials] = useState<Financials>({
    totalSales: 0,
    totalCOGS: 0,
    grossProfit: 0,
    grossMarginPercent: 0,
    totalExpenses: 0,
    netProfit: 0,
    overallMarginPercent: 0,
  })
  const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    category: 'Shop Rent',
    amount: '',
    note: '',
    date: new Date().toISOString().split('T')[0],
  })

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/expenses')
      const data = await res.json()
      setExpenses(data.expenses || [])
      setFinancials(
        data.financials || {
          totalSales: 0,
          totalCOGS: 0,
          grossProfit: 0,
          grossMarginPercent: 0,
          totalExpenses: 0,
          netProfit: 0,
          overallMarginPercent: 0,
        }
      )
      setCategoryTotals(data.categoryTotals || {})
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()
  }, [])

  const filteredExpenses = useMemo(() => {
    if (selectedCategory === 'All') return expenses
    return expenses.filter((e) => e.category === selectedCategory)
  }, [expenses, selectedCategory])

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Failed to add expense')
      setFormData({
        category: 'Shop Rent',
        amount: '',
        note: '',
        date: new Date().toISOString().split('T')[0],
      })
      setShowAddModal(false)
      fetchExpenses()
    } catch (err) {
      alert('Error: ' + err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense entry?')) return
    try {
      await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
      fetchExpenses()
    } catch (err) {
      alert('Error: ' + err)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Expenses &amp; Net Profit Margins</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              Financial Health
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Track daily operating expenses, cost of goods sold, and real-time net shop profit
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <a
            href="/api/export?type=expenses"
            download
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300/80 transition-all shadow-xs"
            title="Download expenses report in CSV / Excel"
          >
            <span>📊</span>
            <span>Export CSV</span>
          </a>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span>+</span>
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* OVERALL MARGIN & FINANCIAL HEALTH BANNER (10/10 feature) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-blue-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-blue-300 font-semibold">
              Business Performance Summary
            </div>
            <div className="text-3xl font-extrabold mt-1 flex items-baseline gap-3">
              <span>Overall Net Margin:</span>
              <span className="text-emerald-400">
                {financials.overallMarginPercent.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-blue-200 mt-1 max-w-xl">
              Calculated as: Total Revenue (₹{financials.totalSales.toLocaleString('en-IN')}) minus Wholesale Cost of Goods (₹{financials.totalCOGS.toLocaleString('en-IN')}) minus Operating Expenses (₹{financials.totalExpenses.toLocaleString('en-IN')}).
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10">
            <div>
              <div className="text-[11px] text-blue-200 uppercase font-medium">Gross Revenue</div>
              <div className="text-lg font-bold text-white mt-0.5">
                ₹{financials.totalSales.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-blue-200 uppercase font-medium">Wholesale COGS</div>
              <div className="text-lg font-bold text-amber-300 mt-0.5">
                ₹{financials.totalCOGS.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-blue-200 uppercase font-medium">Total Expenses</div>
              <div className="text-lg font-bold text-rose-300 mt-0.5">
                ₹{financials.totalExpenses.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-blue-200 uppercase font-medium">Net Profit</div>
              <div className="text-lg font-bold text-emerald-300 mt-0.5">
                ₹{financials.netProfit.toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Expense Categories Breakdown Cards */}
      <div>
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
          Category-wise Expense Breakdown
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(categoryTotals).map(([cat, total]) => (
            <div
              key={cat}
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 transition-colors"
            >
              <div className="text-xs font-semibold text-gray-500 truncate">{cat}</div>
              <div className="text-lg font-bold text-gray-900 mt-1">
                ₹{total.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {financials.totalExpenses > 0
                  ? ((total / financials.totalExpenses) * 100).toFixed(0)
                  : 0}
                % of total expenses
              </div>
            </div>
          ))}
          {Object.keys(categoryTotals).length === 0 && (
            <div className="col-span-4 bg-white p-6 rounded-xl border border-gray-200 text-center text-gray-400 text-sm">
              No expenses recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* Expense History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-900">Expense Logs</h2>
            <span className="text-xs text-gray-400">({filteredExpenses.length} entries)</span>
          </div>

          {/* Filter by Category */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">Filter:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 text-xs font-medium"
            >
              <option value="All">All Categories</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading expenses...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No expenses recorded for this selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3.5">Date</th>
                  <th className="text-left px-4 py-3.5">Category</th>
                  <th className="text-left px-4 py-3.5">Note / Purpose</th>
                  <th className="text-right px-4 py-3.5">Amount (₹)</th>
                  <th className="text-right px-4 py-3.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3.5 text-xs text-gray-500 font-medium whitespace-nowrap">
                      {new Date(exp.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 text-xs font-medium">
                      {exp.note || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-rose-600">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="text-xs text-gray-400 hover:text-rose-600 px-2 py-1 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Record Shop Expense</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Expense Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Amount (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 2500"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Note / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lorry freight from Parkal to Siddipet"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

