'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { IconPlus, IconDownload, IconSearch } from '@/components/Icons'

interface Bill {
  id: number
  billNumber: string
  customerName: string
  customerPhone: string
  total: number
  amountPaid: number
  status: string
  paymentMode: string
  notes?: string
  createdAt: string
}

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  // Quick Update Bill Modal
  const [updatingBill, setUpdatingBill] = useState<Bill | null>(null)
  const [editAmountPaid, setEditAmountPaid] = useState('')
  const [editPaymentMode, setEditPaymentMode] = useState('cash')
  const [editStatus, setEditStatus] = useState('paid')
  const [editNotes, setEditNotes] = useState('')
  const [savingUpdate, setSavingUpdate] = useState(false)

  const fetchBills = async (q = '') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/bills?search=${q}&limit=150`)
      const data = await res.json()
      setBills(data.bills || [])
      setTotal(data.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBills()
  }, [])

  const filteredBills = useMemo(() => {
    if (statusFilter === 'all') return bills
    return bills.filter((b) => b.status === statusFilter)
  }, [bills, statusFilter])

  const totalBilled = bills.reduce((sum, b) => sum + (b.total || 0), 0)
  const totalCollected = bills.reduce((sum, b) => sum + (b.amountPaid || 0), 0)
  const totalDue = Math.max(0, totalBilled - totalCollected)

  const openUpdateModal = (bill: Bill) => {
    setUpdatingBill(bill)
    setEditAmountPaid(String(bill.amountPaid))
    setEditPaymentMode(bill.paymentMode || 'cash')
    setEditStatus(bill.status)
    setEditNotes(bill.notes || '')
  }

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!updatingBill) return
    setSavingUpdate(true)
    try {
      const res = await fetch(`/api/bills/${updatingBill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountPaid: parseFloat(editAmountPaid) || 0,
          paymentMode: editPaymentMode,
          status: editStatus,
          notes: editNotes,
        }),
      })
      if (!res.ok) throw new Error('Update failed')
      setUpdatingBill(null)
      fetchBills(search)
    } catch (err) {
      alert('Error updating bill: ' + err)
    } finally {
      setSavingUpdate(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 tracking-tight">Invoices</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {total} transactions &bull; Serial invoice records
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <a
            href="/api/export?type=bills"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors shadow-2xs"
          >
            <IconDownload className="w-3.5 h-3.5 text-zinc-500" />
            <span>Export CSV</span>
          </a>
          <Link
            href="/billing/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-zinc-900 hover:bg-black text-xs font-medium text-white transition-colors shadow-2xs"
          >
            <IconPlus className="w-3.5 h-3.5" />
            <span>New Sale</span>
          </Link>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total Sales Invoiced</div>
          <div className="mt-1.5 text-xl font-semibold text-zinc-950 font-mono">₹{totalBilled.toLocaleString('en-IN')}</div>
          <div className="text-xs text-zinc-400 mt-0.5">{total} Generated Invoices</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Realized Cash</div>
          <div className="mt-1.5 text-xl font-semibold text-emerald-700 font-mono">₹{totalCollected.toLocaleString('en-IN')}</div>
          <div className="text-xs text-emerald-600 font-medium mt-0.5">
            {totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : 100}% collected
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Outstanding Khata</div>
          <div className="mt-1.5 text-xl font-semibold text-amber-700 font-mono">₹{totalDue.toLocaleString('en-IN')}</div>
          <div className="text-xs text-zinc-400 mt-0.5">Pending Customer Balances</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <IconSearch className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search invoice number, customer, phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              fetchBills(e.target.value)
            }}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-md text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-xs font-medium self-start sm:self-center">
          {[
            { id: 'all', label: 'All' },
            { id: 'paid', label: 'Paid' },
            { id: 'partial', label: 'Partial' },
            { id: 'pending', label: 'Pending' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === tab.id
                  ? 'bg-white text-zinc-950 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-xs">
            Loading invoices...
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-xs">
            No invoices found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200/80 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-2.5">Invoice</th>
                  <th className="text-left px-5 py-2.5">Customer</th>
                  <th className="text-left px-5 py-2.5">Date</th>
                  <th className="text-right px-5 py-2.5">Amount</th>
                  <th className="text-right px-5 py-2.5">Paid</th>
                  <th className="text-right px-5 py-2.5">Balance</th>
                  <th className="text-center px-5 py-2.5">Status</th>
                  <th className="text-right px-5 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredBills.map((bill) => {
                  const balanceDue = Math.max(0, bill.total - (bill.amountPaid || 0))
                  const isPaid = bill.status === 'paid'
                  const isPartial = bill.status === 'partial'

                  return (
                    <tr key={bill.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="px-5 py-3 font-mono font-semibold text-zinc-900">
                        {bill.billNumber}
                      </td>

                      <td className="px-5 py-3">
                        <div className="font-medium text-zinc-900">{bill.customerName}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">{bill.customerPhone || 'Walk-in'}</div>
                      </td>

                      <td className="px-5 py-3 text-zinc-500 whitespace-nowrap">
                        {new Date(bill.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-5 py-3 text-right font-mono font-semibold text-zinc-900">
                        ₹{bill.total.toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-3 text-right font-mono text-emerald-700">
                        ₹{(bill.amountPaid || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="px-5 py-3 text-right font-mono font-medium">
                        {balanceDue > 0 ? (
                          <span className="text-amber-700">₹{balanceDue.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-zinc-400">₹0</span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-800'
                              : isPartial
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              isPaid ? 'bg-emerald-500' : isPartial ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{bill.status}</span>
                        </span>
                      </td>

                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openUpdateModal(bill)}
                            className="text-zinc-600 hover:text-zinc-950 font-medium hover:underline"
                          >
                            Update
                          </button>
                          <span className="text-zinc-300">|</span>
                          <Link
                            href={`/billing/${bill.id}`}
                            className="font-medium text-zinc-900 hover:underline"
                          >
                            View
                          </Link>
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

      {/* Update Bill Modal */}
      {updatingBill && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between border-b pb-2.5">
              <div>
                <h3 className="text-xs font-semibold text-zinc-900 uppercase">Update Payment</h3>
                <div className="text-[11px] font-mono text-zinc-500">
                  {updatingBill.billNumber} &bull; {updatingBill.customerName}
                </div>
              </div>
              <button
                onClick={() => setUpdatingBill(null)}
                className="text-zinc-400 hover:text-zinc-700 text-sm font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveUpdate} className="space-y-3 text-xs">
              <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 flex justify-between">
                <div>
                  <div className="text-zinc-400 text-[10px]">Total Billed</div>
                  <div className="font-mono font-semibold text-zinc-900">₹{updatingBill.total.toLocaleString('en-IN')}</div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-400 text-[10px]">Remaining Balance</div>
                  <div className="font-mono font-semibold text-amber-700">
                    ₹{Math.max(0, updatingBill.total - (parseFloat(editAmountPaid) || 0)).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-700 mb-1">
                  Amount Paid (₹)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="any"
                    value={editAmountPaid}
                    onChange={(e) => setEditAmountPaid(e.target.value)}
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-md px-2.5 py-1 text-xs font-mono font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setEditAmountPaid(String(updatingBill.total))}
                    className="px-2 py-1 text-[11px] bg-zinc-100 hover:bg-zinc-200 rounded-md text-zinc-700"
                  >
                    Full
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 mb-1">Mode</label>
                  <select
                    value={editPaymentMode}
                    onChange={(e) => setEditPaymentMode(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  >
                    <option value="paid">Paid</option>
                    <option value="partial">Partial</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional remarks"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-950"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setUpdatingBill(null)}
                  className="flex-1 py-1.5 rounded-md border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUpdate}
                  className="flex-1 py-1.5 rounded-md bg-zinc-900 hover:bg-black text-white font-medium"
                >
                  {savingUpdate ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
