'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface CustomerBill {
  total: number
  amountPaid: number
}

interface Customer {
  id: number
  name: string
  phone: string
  address: string
  bills: CustomerBill[]
  createdAt: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Record Payment Modal
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState('cash')
  const [payNote, setPayNote] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/customers')
      if (res.ok) {
        const data = await res.json()
        setCustomers(data.customers || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  // Calculate totals
  let totalBilledAll = 0
  let totalPaidAll = 0
  let totalCreditDueAll = 0

  customers.forEach((c) => {
    const billed = c.bills.reduce((sum, b) => sum + (b.total || 0), 0)
    const paid = c.bills.reduce((sum, b) => sum + (b.amountPaid || 0), 0)
    totalBilledAll += billed
    totalPaidAll += paid
    totalCreditDueAll += Math.max(0, billed - paid)
  })

  // Filtered by search
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase())
  )

  const handleOpenPayment = (c: Customer, balance: number) => {
    setActiveCustomer(c)
    setPayAmount(String(balance))
    setPayMode('cash')
    setPayNote(`Balance settlement for ${c.name}`)
  }

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCustomer || !payAmount) return
    setSavingPayment(true)
    try {
      const res = await fetch(`/api/customers/${activeCustomer.id}/khata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(payAmount),
          paymentMode: payMode,
          note: payNote,
        }),
      })
      if (!res.ok) throw new Error('Payment recording failed')
      setActiveCustomer(null)
      fetchCustomers()
    } catch (err: any) {
      alert('Error recording payment: ' + err.message)
    } finally {
      setSavingPayment(false)
    }
  }

  const handleSendReminder = (c: Customer, balance: number) => {
    const cleanPhone = (c.phone || '').replace(/\D/g, '')
    const msg =
      `Namaste *${c.name}* garu,\n` +
      `This is a gentle payment reminder from *Maruthi Furnitures & Mattresses*, Siddipet.\n\n` +
      `Your outstanding Khata / Credit balance is: *₹${balance.toLocaleString('en-IN')}*.\n\n` +
      `You can settle it at the shop or pay online via UPI: *paytm.s36d65m@pty* (Alakanti Sai Nithin - Paytm / PhonePe / GPay).\n\n` +
      `For any questions, please contact us at *+91 9908267125*.\n` +
      `Thank you!`

    const targetUrl =
      cleanPhone.length >= 10
        ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`

    window.open(targetUrl, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 tracking-tight">Khata Ledger (Customer Credit)</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {customers.length} registered accounts &bull; Balances &bull; WhatsApp payment reminders
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <Link
            href="/offers"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors shadow-2xs"
          >
            Broadcast
          </Link>
          <Link
            href="/billing/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-zinc-900 hover:bg-black text-xs font-medium text-white transition-colors shadow-2xs"
          >
            + New Sale
          </Link>
        </div>
      </div>

      {/* Khata Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Total Invoiced
          </div>
          <div className="text-xl font-semibold text-zinc-950 mt-1 font-mono">
            ₹{totalBilledAll.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">All customer transactions</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Payments Received
          </div>
          <div className="text-xl font-semibold text-emerald-700 mt-1 font-mono">
            ₹{totalPaidAll.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-0.5">Realized collections</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Total Outstanding (Khata)
          </div>
          <div className="text-xl font-semibold text-amber-700 mt-1 font-mono">
            ₹{totalCreditDueAll.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-amber-800 font-medium mt-0.5">Customer balance due</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search customer name, phone, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Showing <strong>{filtered.length}</strong> of {customers.length}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No customers match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3.5">Customer Name</th>
                  <th className="text-left px-4 py-3.5">Phone Number</th>
                  <th className="text-center px-4 py-3.5">Invoices</th>
                  <th className="text-right px-4 py-3.5">Total Billed</th>
                  <th className="text-right px-4 py-3.5">Khata Balance</th>
                  <th className="text-right px-4 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => {
                  const totalSpent = c.bills.reduce((sum, b) => sum + (b.total || 0), 0)
                  const totalPaid = c.bills.reduce((sum, b) => sum + (b.amountPaid || 0), 0)
                  const balance = Math.max(0, totalSpent - totalPaid)

                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-gray-900">{c.name}</div>
                        {c.address && <div className="text-[11px] text-gray-400">{c.address}</div>}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-gray-600 text-xs">
                        {c.phone || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-blue-700">
                        {c.bills.length}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-gray-900">
                        ₹{totalSpent.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono">
                        {balance > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            ₹{balance.toLocaleString('en-IN')} Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Clear ✓
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {balance > 0 && (
                            <>
                              <button
                                onClick={() => handleOpenPayment(c, balance)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs"
                                title="Collect payment and clear Khata"
                              >
                                Record Pay
                              </button>
                              <button
                                onClick={() => handleSendReminder(c, balance)}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all flex items-center gap-1"
                                title="Send WhatsApp payment reminder"
                              >
                                <span>💬</span> Reminder
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {activeCustomer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">💰</span>
                <h2 className="text-base font-bold text-gray-900">Record Khata Payment</h2>
              </div>
              <button
                onClick={() => setActiveCustomer(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-0.5">
                  Customer
                </label>
                <div className="text-sm font-bold text-gray-900">{activeCustomer.name}</div>
                <div className="text-xs text-gray-400">{activeCustomer.phone}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Payment Amount Received (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border-2 border-emerald-500 rounded-xl px-3.5 py-2 text-lg font-mono font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Payment Mode
                </label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="bank_transfer">Bank Transfer / NEFT</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Payment Note / Reference
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="e.g. Cleared pending cot balance"
                  className="w-full border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setActiveCustomer(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayment || !payAmount}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
                >
                  {savingPayment ? 'Saving...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
