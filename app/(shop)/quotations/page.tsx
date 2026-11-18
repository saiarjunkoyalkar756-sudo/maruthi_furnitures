'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IconReceipt, IconPrinter, IconCheck, IconPlus, IconSearch } from '@/components/Icons'

interface QuoteItem {
  name: string
  qty: number
  price: number
}

interface Quotation {
  id: number
  quoteNumber: string
  customerName: string
  customerPhone: string
  items: QuoteItem[]
  subtotal: number
  discount: number
  total: number
  validUntil: string
  status: string
  convertedBillId?: number
  convertedBillNumber?: string
  notes?: string
  createdAt: string
}

export default function QuotationsPage() {
  const router = useRouter()
  const [quotes, setQuotes] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [convertingId, setConvertingId] = useState<number | null>(null)

  const fetchQuotes = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/quotations')
      const data = await res.json()
      setQuotes(data.quotes || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes()
  }, [])

  const filtered = quotes.filter(q =>
    q.customerName.toLowerCase().includes(search.toLowerCase()) ||
    q.customerPhone.includes(search) ||
    q.quoteNumber.toLowerCase().includes(search.toLowerCase())
  )

  const totalPipeline = quotes
    .filter(q => q.status === 'active')
    .reduce((sum, q) => sum + (q.total || 0), 0)

  const convertedCount = quotes.filter(q => q.status === 'converted').length

  // 1-Click Convert Estimate to Invoice
  const handleConvertToBill = async (quote: Quotation) => {
    if (!confirm(`Convert Estimate ${quote.quoteNumber} into an official Tax Invoice for ${quote.customerName}?`)) return
    setConvertingId(quote.id)
    try {
      const res = await fetch(`/api/quotations/${quote.id}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Conversion failed')
      router.push(`/billing/${data.bill.id}`)
    } catch (err: any) {
      alert('Error converting estimate: ' + err.message)
      setConvertingId(null)
    }
  }

  // Send WhatsApp Estimate
  const handleSendWhatsApp = (q: Quotation) => {
    const cleanPhone = (q.customerPhone || '').replace(/\D/g, '')
    const itemsText = q.items.map(i => `• ${i.name} (x${i.qty}) — ₹${(i.price * i.qty).toLocaleString('en-IN')}`).join('\n')
    const validDate = new Date(q.validUntil).toLocaleDateString('en-IN')

    const msg =
      `*MARUTHI FURNITURES & MATTRESSES — OFFICIAL ESTIMATE*\n` +
      `Bypass Road, Siddipet | Helpline: +91 9908267125\n\n` +
      `*Estimate No:* ${q.quoteNumber}\n` +
      `*Customer:* ${q.customerName}\n` +
      `*Valid Until:* ${validDate}\n\n` +
      `*Selected Furniture / Mattress Articles:*\n${itemsText}\n\n` +
      `*Estimated Total:* *₹${q.total.toLocaleString('en-IN')}*\n` +
      (q.discount > 0 ? `*(Includes Special Showroom Offer: -₹${q.discount.toLocaleString('en-IN')})*\n` : '') +
      `\nVisit our flagship showroom to finalize your custom sizes or lock your order price.\n` +
      `Google Location: https://maps.app.goo.gl/HXXPsA8vDLrzfBRb6`

    const targetUrl = cleanPhone.length >= 10
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`

    window.open(targetUrl, '_blank')
  }

  // Print Formal Architectural Estimate
  const printQuote = (q: Quotation) => {
    const win = window.open('', '_blank')
    if (!win) return

    win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Estimate ${q.quoteNumber} - Maruthi Furnitures</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; background: #fff; margin: 0; padding: 0; font-size: 13px; }
    .quote-box { border: 2px solid #005a36; border-radius: 8px; overflow: hidden; }
    .header { background: #005a36; color: #fff; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; }
    .brand { font-size: 20px; font-weight: 800; letter-spacing: 1px; }
    .meta-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; padding: 16px 22px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .card { background: #fff; border: 1px solid #cbd5e1; padding: 12px 14px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #e2e8f0; }
    th { background: #00472b; color: #fff; padding: 10px 14px; font-size: 11px; text-transform: uppercase; text-align: left; }
    td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .totals { padding: 16px 22px; display: flex; justify-content: flex-end; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .total-card { width: 280px; font-size: 13px; }
    .row { display: flex; justify-content: space-between; padding: 4px 0; }
    .grand { font-size: 17px; font-weight: 800; color: #005a36; border-top: 1.5px solid #005a36; margin-top: 6px; padding-top: 6px; }
  </style>
</head>
<body>
  <div class="quote-box">
    <div class="header">
      <div>
        <div class="brand">MARUTHI FURNITURES &amp; MATTRESSES</div>
        <div style="font-size: 11px; color: #d1fae5; margin-top: 3px;">Bypass Road, Beside RS Metro Gardens, Siddipet &bull; +91 9908267125</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; color: #d1fae5; text-transform: uppercase;">Official Quotation / Estimate</div>
        <div style="font-size: 18px; font-weight: bold; font-family: monospace;">${q.quoteNumber}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="card">
        <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Prepared For:</div>
        <div style="font-size: 15px; font-weight: bold; margin-top: 2px;">${q.customerName}</div>
        <div style="font-size: 12px; color: #475569; margin-top: 2px;">Phone: <strong>${q.customerPhone || 'Counter Walk-in'}</strong></div>
      </div>
      <div class="card">
        <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Proposal Validity:</div>
        <div style="font-size: 13px; font-weight: bold; color: #005a36;">Valid Until: ${new Date(q.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Prices locked upon advance token payment.</div>
      </div>
    </div>

    <div style="padding: 0 22px;">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Item Specification</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Rate (₹)</th>
            <th style="text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${q.items.map((i, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${i.name}</strong></td>
              <td style="text-align: center; font-weight: bold;">${i.qty}</td>
              <td style="text-align: right; font-family: monospace;">₹${i.price.toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-family: monospace; font-weight: bold;">₹${(i.price * i.qty).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="totals">
      <div class="total-card">
        <div class="row">
          <span>Subtotal</span>
          <span>₹${q.subtotal.toLocaleString('en-IN')}</span>
        </div>
        ${q.discount > 0 ? `
          <div class="row" style="color: #005a36; font-weight: bold;">
            <span>Showroom Offer</span>
            <span>-₹${q.discount.toLocaleString('en-IN')}</span>
          </div>
        ` : ''}
        <div class="row grand">
          <span>Final Estimate</span>
          <span>₹${q.total.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>

    <div style="padding: 16px 22px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: end;">
      <div>
        &bull; 100% Seasoned CP Teak &amp; Orthopedic Foam Guarantee.<br/>
        &bull; Free white-glove delivery across Siddipet on confirmed orders.
      </div>
      <div style="text-align: right; font-weight: bold; color: #005a36;">
        MARUTHI FURNITURES &bull; Authorized Executive
      </div>
    </div>
  </div>

  <script>window.onload = function() { setTimeout(function() { window.print(); }, 250); }</script>
</body>
</html>
    `)
    win.document.close()
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Quotations &amp; Walk-In Estimates</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
              Lead Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Give customers formal proposals &bull; Share on WhatsApp &bull; 1-Click Convert into Bill
          </p>
        </div>

        <Link
          href="/quotations/new"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#005a36] hover:bg-[#00472b] text-white text-xs font-bold shadow-xs transition-colors self-start"
        >
          <IconPlus className="w-4 h-4" />
          <span>+ Create New Estimate</span>
        </Link>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Pipeline Value</div>
          <div className="text-2xl font-extrabold text-[#005a36] mt-1 font-mono">
            ₹{totalPipeline.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Unconverted customer proposals</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Converted Into Bills</div>
          <div className="text-2xl font-extrabold text-blue-700 mt-1 font-mono">
            {convertedCount} Orders
          </div>
          <div className="text-xs text-blue-600 font-medium mt-0.5">Won &amp; Invoiced customers</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Proposals Issued</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
            {quotes.length}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Walk-in inquiry records</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <IconSearch className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone, or estimate #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#005a36]"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{filtered.length}</strong> of {quotes.length}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading estimates...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-3">
            <div>No quotations found. Create your first walk-in estimate to start tracking leads!</div>
            <Link
              href="/quotations/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#005a36] text-white text-xs font-semibold"
            >
              + Create First Estimate
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3">Estimate No</th>
                  <th className="text-left px-4 py-3">Customer Details</th>
                  <th className="text-center px-4 py-3">Articles</th>
                  <th className="text-right px-4 py-3">Estimated Total</th>
                  <th className="text-center px-4 py-3">Validity</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {q.quoteNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{q.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{q.customerPhone || 'Counter'}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {q.items.length} items
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-[#005a36]">
                      ₹{q.total.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px]">
                      {new Date(q.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-wider border ${
                        q.status === 'converted'
                          ? 'bg-blue-50 text-blue-800 border-blue-200'
                          : q.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {q.status === 'converted' ? `Won (${q.convertedBillNumber || 'Billed'})` : q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      {/* WhatsApp Button */}
                      <button
                        onClick={() => handleSendWhatsApp(q)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                        title="Send on WhatsApp"
                      >
                        📱 WhatsApp
                      </button>

                      {/* Print Button */}
                      <button
                        onClick={() => printQuote(q)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
                        title="Print Estimate"
                      >
                        🖨️ Print
                      </button>

                      {/* 1-Click Convert to Bill */}
                      {q.status !== 'converted' ? (
                        <button
                          onClick={() => handleConvertToBill(q)}
                          disabled={convertingId === q.id}
                          className="px-3 py-1.5 rounded-lg bg-[#005a36] hover:bg-[#00472b] text-white font-bold transition-all shadow-2xs"
                        >
                          {convertingId === q.id ? 'Converting...' : '⚡ Convert to Invoice'}
                        </button>
                      ) : (
                        <Link
                          href={`/billing/${q.convertedBillId}`}
                          className="inline-block px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-semibold"
                        >
                          View Bill →
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
