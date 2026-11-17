'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { generateQrDataUrl, generateUpiString } from '@/lib/upiQr'
import { numberToWordsIndian } from '@/lib/indianCurrency'
import {
  IconReceipt,
  IconPrinter,
  IconQr,
  IconArrowRight,
  IconCheck,
} from '@/components/Icons'

interface BillItem {
  id: number
  name: string
  qty: number
  price: number
  costPrice?: number
  gstRate: number
  total: number
}

interface Bill {
  id: number
  billNumber: string
  customerName: string
  customerPhone: string
  items: BillItem[]
  subtotal: number
  discount: number
  discountType: string
  cgst: number
  sgst: number
  total: number
  amountPaid: number
  paymentMode: string
  status: string
  notes: string
  pricingType: string
  createdAt: string
}

export default function BillDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [bill, setBill] = useState<Bill | null>(null)
  const [loading, setLoading] = useState(true)
  const [upiQrUrl, setUpiQrUrl] = useState<string>('')
  const [showQrModal, setShowQrModal] = useState(false)

  // Update modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editAmountPaid, setEditAmountPaid] = useState('')
  const [editPaymentMode, setEditPaymentMode] = useState('cash')
  const [editStatus, setEditStatus] = useState('paid')
  const [editNotes, setEditNotes] = useState('')
  const [savingUpdate, setSavingUpdate] = useState(false)

  const fetchBill = async () => {
    try {
      const r = await fetch(`/api/bills/${id}`)
      const d = await r.json()
      setBill(d)
      if (d) {
        setEditAmountPaid(String(d.amountPaid || 0))
        setEditPaymentMode(d.paymentMode || 'cash')
        setEditStatus(d.status || 'paid')
        setEditNotes(d.notes || '')

        // Generate dynamic UPI QR Code with exact bill amount and serial bill number
        const upiUri = generateUpiString({
          amount: d.total,
          billNumber: d.billNumber,
        })
        const qr = await generateQrDataUrl(upiUri)
        setUpiQrUrl(qr)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBill()
  }, [id])

  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bill) return
    setSavingUpdate(true)
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
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
      setShowEditModal(false)
      fetchBill()
    } catch (err) {
      alert('Error updating bill: ' + err)
    } finally {
      setSavingUpdate(false)
    }
  }

  // 1. Bespoke Luxury A4 Retail Tax / Cash Invoice with Dynamic UPI QR
  const printBill = () => {
    if (!bill) return
    const win = window.open('', '_blank')
    if (!win) return

    const balance = Math.max(0, bill.total - (bill.amountPaid || 0))
    const amountInWords = numberToWordsIndian(bill.total)

    win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${bill.billNumber} - Maruthi Furnitures</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.4;
    }
    .invoice-card {
      border: 1.5px solid #005a36;
      border-radius: 8px;
      overflow: hidden;
      padding: 0;
    }
    .top-banner {
      background: linear-gradient(135deg, #00472b 0%, #002e1c 100%);
      color: #fff;
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #e5a919;
    }
    .brand-section {
      display: flex;
      align-items: center;
      gap: 18px;
    }
    .brand-logo {
      height: 64px;
      width: auto;
      background: #ffffff;
      padding: 6px 12px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      object-fit: contain;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #ffffff;
      text-transform: uppercase;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #cbd5e1;
      margin-top: 3px;
      letter-spacing: 0.2px;
    }
    .brand-contact {
      font-size: 11px;
      color: #fef08a;
      margin-top: 4px;
      font-weight: 600;
    }
    .invoice-badge-box {
      text-align: right;
    }
    .invoice-title {
      font-size: 11px;
      font-weight: 700;
      color: #93c5fd;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .invoice-number {
      font-size: 20px;
      font-weight: 800;
      color: #ffffff;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      margin: 2px 0;
    }
    .invoice-date {
      font-size: 11px;
      color: #cbd5e1;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 16px;
      padding: 16px 22px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-block {
      background: #ffffff;
      padding: 12px 14px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .info-label {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .info-name {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }
    .info-detail {
      font-size: 12px;
      color: #475569;
      margin-top: 2px;
    }
    .table-container {
      padding: 16px 22px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
    }
    th {
      background: #00472b;
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 9px 12px;
      text-align: left;
    }
    td {
      padding: 9px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12.5px;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .words-strip {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      margin: 14px 22px 0 22px;
      font-size: 12px;
    }
    .words-label {
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    .words-value {
      font-weight: 700;
      color: #00472b;
      margin-left: 6px;
    }
    .summary-section {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 20px;
      padding: 16px 22px;
      align-items: start;
    }
    .payment-panel {
      border: 1.5px dashed #005a36;
      border-radius: 8px;
      padding: 12px 14px;
      background: #f0fdf4;
      display: flex;
      gap: 14px;
      align-items: center;
    }
    .dynamic-qr-img {
      width: 115px;
      height: 115px;
      background: #ffffff;
      padding: 4px;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 1px solid #bbf7d0;
      display: block;
      flex-shrink: 0;
    }
    .qr-details {
      flex: 1;
    }
    .qr-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      background: #00472b;
      color: #fff;
      padding: 2px 8px;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .qr-amount-callout {
      font-size: 15px;
      font-weight: 800;
      color: #00472b;
      font-family: ui-monospace, monospace;
      margin: 1px 0 2px 0;
    }
    .qr-payee {
      font-size: 11.5px;
      font-weight: 800;
      color: #0f172a;
    }
    .qr-vpa {
      font-size: 11.5px;
      font-family: ui-monospace, monospace;
      font-weight: 700;
      color: #00472b;
      margin: 1px 0;
    }
    .qr-note {
      font-size: 9.5px;
      color: #475569;
      line-height: 1.3;
      margin-top: 2px;
    }
    .totals-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      background: #fff;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 7px 12px;
      font-size: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .totals-row.grand {
      background: #00472b;
      color: #fff;
      font-weight: 800;
      font-size: 15px;
      border-bottom: none;
    }
    .totals-row.paid {
      color: #005a36;
      font-weight: 700;
    }
    .totals-row.due {
      color: #b91c1c;
      font-weight: 800;
      background: #fef2f2;
    }
    .terms-signatures {
      display: grid;
      grid-template-columns: 1.3fr 1fr;
      gap: 20px;
      padding: 16px 22px 20px 22px;
      border-top: 1px solid #e2e8f0;
      align-items: end;
    }
    .terms {
      font-size: 10.5px;
      color: #64748b;
      line-height: 1.5;
    }
    .signatures {
      text-align: right;
    }
    .sig-line {
      display: inline-block;
      width: 190px;
      border-top: 1.5px solid #0f172a;
      padding-top: 6px;
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
    }
    .sig-sub {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 2px;
    }
    @media print {
      button { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <!-- Header Banner -->
    <div class="top-banner">
      <div class="brand-section">
        <img src="/logo.jpg" class="brand-logo" alt="Maruthi Furnitures" />
        <div>
          <h1 class="brand-title">MARUTHI FURNITURES &amp; MATTRESSES</h1>
          <div class="brand-subtitle">Bypass Road, Mytri Vanam, Beside RS Metro Garden, Siddipet, Telangana - 502103</div>
          <div class="brand-contact">Phone: +91 9908267125 &bull; Email: maruthifurnitures001@gmail.com</div>
        </div>
      </div>
      <div class="invoice-badge-box">
        <div class="invoice-title">Retail Invoice</div>
        <div class="invoice-number">${bill.billNumber}</div>
        <div class="invoice-date">${new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
      </div>
    </div>

    <!-- Metadata Section (Customer & Billing Only - Transport Removed) -->
    <div class="info-grid">
      <div class="info-block">
        <div class="info-label">Customer Details (Billed To)</div>
        <div class="info-name">${bill.customerName}</div>
        <div class="info-detail">Mobile: <strong>${bill.customerPhone || 'N/A'}</strong></div>
        <div class="info-detail">Destination: Siddipet &amp; Surroundings</div>
      </div>

      <div class="info-block">
        <div class="info-label">Billing &amp; Payment Status</div>
        <div class="info-detail">Payment Mode: <strong>${(bill.paymentMode || 'cash').toUpperCase()}</strong></div>
        <div class="info-detail">Invoice Status: <strong style="color:${bill.status === 'paid' ? '#005a36' : '#b91c1c'}">${(bill.status || 'paid').toUpperCase()}</strong></div>
        <div class="info-detail">GST Status: <strong>Tax Exempt (Zero GST)</strong></div>
      </div>
    </div>

    <!-- Furniture Line Items -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 36px; text-align: center;">#</th>
            <th>Item Particulars / Description</th>
            <th style="width: 70px; text-align: center;">Qty</th>
            <th style="width: 120px; text-align: right;">Rate (₹)</th>
            <th style="width: 140px; text-align: right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${bill.items.map((it, idx) => `
            <tr>
              <td style="text-align: center; color: #64748b; font-weight: 600;">${idx + 1}</td>
              <td>
                <strong style="color: #0f172a; font-size: 13px;">${it.name}</strong>
              </td>
              <td style="text-align: center; font-weight: 700; color: #00472b;">${it.qty}</td>
              <td style="text-align: right; font-family: ui-monospace, monospace;">₹${it.price.toLocaleString('en-IN')}</td>
              <td style="text-align: right; font-family: ui-monospace, monospace; font-weight: 700; color: #0f172a;">₹${(it.price * it.qty).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Amount in Words -->
    <div class="words-strip">
      <span class="words-label">Amount in Words:</span>
      <span class="words-value">${amountInWords}</span>
    </div>

    <!-- Payment & Totals Section with Dynamic UPI QR -->
    <div class="summary-section">
      <!-- Dynamic UPI QR Panel (Auto-pre-filled Amount) -->
      <div class="payment-panel">
        ${upiQrUrl ? `<img src="${upiQrUrl}" class="dynamic-qr-img" alt="Dynamic UPI QR" />` : ''}
        <div class="qr-details">
          <div class="qr-badge">Dynamic UPI QR &bull; Auto-Amount</div>
          <div class="qr-amount-callout">₹${bill.total.toLocaleString('en-IN')}</div>
          <div class="qr-payee">Payee: <strong>ALAKANTI SAI NITHIN</strong></div>
          <div class="qr-vpa">UPI ID: <strong>paytm.s36d65m@pty</strong></div>
          <div class="qr-note">Scan with PhonePe, Google Pay, Paytm, or BHIM. Pre-filled amount with zero surcharge.</div>
        </div>
      </div>

      <!-- Financial Totals -->
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal</span>
          <span style="font-family: ui-monospace, monospace; font-weight: 600;">₹${bill.subtotal.toLocaleString('en-IN')}</span>
        </div>
        ${bill.discount > 0 ? `
          <div class="totals-row" style="color: #005a36;">
            <span>Special Discount</span>
            <span style="font-family: ui-monospace, monospace; font-weight: 700;">-₹${bill.discount.toLocaleString('en-IN')}</span>
          </div>
        ` : ''}
        <div class="totals-row grand">
          <span>Net Total Payable</span>
          <span style="font-family: ui-monospace, monospace;">₹${bill.total.toLocaleString('en-IN')}</span>
        </div>
        <div class="totals-row paid">
          <span>Amount Received (${(bill.paymentMode || 'cash').toUpperCase()})</span>
          <span style="font-family: ui-monospace, monospace;">₹${(bill.amountPaid || 0).toLocaleString('en-IN')}</span>
        </div>
        ${balance > 0 ? `
          <div class="totals-row due">
            <span>Balance Due / Khata</span>
            <span style="font-family: ui-monospace, monospace;">₹${balance.toLocaleString('en-IN')}</span>
          </div>
        ` : ''}
      </div>
    </div>

    ${bill.notes ? `
      <div style="padding: 0 22px 12px 22px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 11px; color: #475569;">
          <strong>Order Remarks:</strong> ${bill.notes}
        </div>
      </div>
    ` : ''}

    <!-- Terms and Signatures -->
    <div class="terms-signatures">
      <div class="terms">
        <strong>Terms &amp; Conditions:</strong><br/>
        1. Goods once sold can be exchanged within 7 days against this original invoice.<br/>
        2. All disputes are subject to Siddipet jurisdiction only.
      </div>
      <div class="signatures">
        <div style="height: 45px;"></div>
        <div class="sig-line">For MARUTHI FURNITURES</div>
        <div class="sig-sub">Authorized Signatory / Cashier</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    }
  </script>
</body>
</html>
    `)
    win.document.close()
  }

  // 2. 80mm Thermal Slip with Dynamic UPI QR
  const printThermal = () => {
    if (!bill) return
    const win = window.open('', '_blank')
    if (!win) return
    const balance = Math.max(0, bill.total - (bill.amountPaid || 0))

    win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Slip ${bill.billNumber}</title>
  <style>
    @page { margin: 0; size: 80mm auto; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 72mm;
      margin: 0 auto;
      padding: 10px 4px;
      font-size: 12px;
      line-height: 1.3;
      color: #000;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .dashed { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 11px; }
    th { text-align: left; border-bottom: 1px dashed #000; padding: 3px 0; }
    td { padding: 3px 0; }
    @media print { body { width: 72mm; } }
  </style>
</head>
<body>
  <div class="text-center">
    <div class="bold" style="font-size:14px">MARUTHI FURNITURES</div>
    <div style="font-size:11px">&amp; MATTRESSES</div>
    <div style="font-size:10px">Bypass Rd, Beside RS Metro Garden, Siddipet</div>
    <div style="font-size:10px">Ph: +91 9908267125</div>
  </div>

  <div class="dashed"></div>

  <div class="row"><span>Invoice:</span><span class="bold">${bill.billNumber}</span></div>
  <div class="row"><span>Date:</span><span>${new Date(bill.createdAt).toLocaleDateString('en-IN')}</span></div>
  <div class="row"><span>Customer:</span><span class="bold">${bill.customerName}</span></div>
  ${bill.customerPhone ? `<div class="row"><span>Phone:</span><span>${bill.customerPhone}</span></div>` : ''}

  <div class="dashed"></div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Rate</th>
        <th class="text-right">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${bill.items.map((i) => `
        <tr>
          <td colspan="4" class="bold">${i.name}</td>
        </tr>
        <tr>
          <td></td>
          <td class="text-right">${i.qty}</td>
          <td class="text-right">₹${i.price}</td>
          <td class="text-right bold">₹${i.price * i.qty}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="dashed"></div>

  <div class="row"><span>Subtotal:</span><span>₹${bill.subtotal}</span></div>
  ${bill.discount > 0 ? `<div class="row"><span>Discount:</span><span>-₹${bill.discount}</span></div>` : ''}
  <div class="row bold" style="font-size:14px"><span>NET TOTAL:</span><span>₹${bill.total}</span></div>
  <div class="row"><span>Paid (${bill.paymentMode}):</span><span>₹${bill.amountPaid}</span></div>
  ${balance > 0 ? `<div class="row bold"><span>BALANCE DUE:</span><span>₹${balance}</span></div>` : ''}

  <div class="dashed"></div>

  <div class="text-center" style="margin-top:6px">
    <div style="font-size:10px;font-weight:bold">SCAN TO PAY (DYNAMIC UPI)</div>
    ${upiQrUrl ? `<img src="${upiQrUrl}" style="width:115px;height:115px;margin:4px auto;display:block" />` : ''}
    <div style="font-size:10px;font-weight:bold">₹${bill.total}</div>
    <div style="font-size:9px;font-weight:bold">ALAKANTI SAI NITHIN</div>
    <div style="font-size:9px">paytm.s36d65m@pty</div>
  </div>

  <div class="dashed"></div>
  <div class="text-center" style="font-size:10px">
    *** THANK YOU ***<br/>
    Visit Again!
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>
    `)
    win.document.close()
  }

  // 3. WhatsApp Share
  const handleSendWhatsApp = () => {
    if (!bill) return
    const phone = (bill.customerPhone || '').replace(/\D/g, '')
    const balance = Math.max(0, bill.total - (bill.amountPaid || 0))
    const msg =
      `*MARUTHI FURNITURES & MATTRESSES*\n` +
      `Bypass Road, Siddipet | Ph: +91 9908267125\n\n` +
      `*Invoice Number:* ${bill.billNumber}\n` +
      `*Customer:* ${bill.customerName}\n` +
      `*Date:* ${new Date(bill.createdAt).toLocaleDateString('en-IN')}\n\n` +
      `*Total Amount:* ₹${bill.total.toLocaleString('en-IN')}\n` +
      `*Amount Paid:* ₹${(bill.amountPaid || 0).toLocaleString('en-IN')}\n` +
      (balance > 0 ? `*Balance Due:* ₹${balance.toLocaleString('en-IN')}\n` : `*Status:* FULLY PAID\n`) +
      `\nPay via UPI: paytm.s36d65m@pty (ALAKANTI SAI NITHIN)\n\n` +
      `Thank you for shopping with Maruthi Furnitures!`

    const targetUrl = phone.length >= 10
      ? `https://wa.me/91${phone.slice(-10)}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`

    window.open(targetUrl, '_blank')
  }

  if (loading) return <div className="p-8 text-zinc-400 text-sm">Loading invoice...</div>
  if (!bill) return <div className="p-8 text-rose-600 text-sm">Invoice not found</div>

  const balanceDue = Math.max(0, bill.total - (bill.amountPaid || 0))
  const wordsAmount = numberToWordsIndian(bill.total)

  return (
    <div className="max-w-5xl space-y-6 mx-auto pb-16">
      {/* Top Bar with Action Buttons (Challan removed) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs">
        <div>
          <div className="text-xs text-zinc-500 mb-1 flex items-center gap-1.5">
            <Link href="/billing" className="hover:underline text-emerald-800 font-bold">
              ← Invoice Ledger
            </Link>
            <span>/</span>
            <span className="font-mono font-bold text-zinc-800">{bill.billNumber}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-950 flex items-center gap-3">
            <span>Invoice {bill.billNumber}</span>
            <span
              className={`text-[11px] px-3 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                bill.status === 'paid'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : bill.status === 'partial'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {bill.status}
            </span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp */}
          <button
            onClick={handleSendWhatsApp}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-2xs"
          >
            <span>WhatsApp</span>
          </button>

          {/* 80mm Thermal */}
          <button
            onClick={printThermal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors shadow-2xs"
          >
            <span>Thermal Slip</span>
          </button>

          {/* A4 Print */}
          <button
            onClick={printBill}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#005a36] hover:bg-[#00472b] text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <IconPrinter className="w-3.5 h-3.5" />
            <span>A4 Invoice</span>
          </button>

          {/* Edit / Payment */}
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors shadow-2xs"
          >
            <span>Update Khata</span>
          </button>
        </div>
      </div>

      {/* Main Luxury Invoice Presentation Card */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm overflow-hidden">
        {/* Brand Banner with Logo */}
        <div className="bg-gradient-to-r from-[#00472b] to-[#002e1c] p-6 border-b-4 border-[#e5a919] text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-36 h-14 bg-white rounded-lg p-1 shadow-sm flex items-center justify-center">
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
              <h2 className="text-xl font-bold tracking-tight text-white uppercase">
                MARUTHI FURNITURES &amp; MATTRESSES
              </h2>
              <p className="text-xs text-emerald-100">
                Bypass Road, Beside RS Metro Garden, Siddipet - 502103
              </p>
              <p className="text-xs text-amber-200 font-semibold mt-0.5">
                Ph: +91 9908267125 &bull; maruthifurnitures001@gmail.com
              </p>
            </div>
          </div>

          <div className="text-left md:text-right bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/15">
            <div className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest">
              Retail Invoice
            </div>
            <div className="text-xl font-extrabold font-mono text-white mt-0.5">
              {bill.billNumber}
            </div>
            <div className="text-xs text-emerald-100">
              {new Date(bill.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Customer & Billing Metadata (Clean 2-Column Grid - Transport Removed) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-zinc-50/70 border-b border-zinc-200/80">
          <div className="bg-white p-4 rounded-xl border border-zinc-200/80">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Billed To Customer
            </div>
            <div className="text-base font-bold text-zinc-900 mt-1">{bill.customerName}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Phone: <strong className="text-zinc-800">{bill.customerPhone || 'Walk-in counter sale'}</strong>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200/80">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Payment &amp; Ledger Status
            </div>
            <div className="text-sm font-semibold text-zinc-900 mt-1 capitalize">
              Payment Mode: {bill.paymentMode}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Paid: <strong className="text-emerald-700 font-mono">₹{(bill.amountPaid || 0).toLocaleString('en-IN')}</strong> &bull; Due:{' '}
              <strong className={balanceDue > 0 ? 'text-rose-600 font-mono' : 'text-zinc-600 font-mono'}>
                ₹{balanceDue.toLocaleString('en-IN')}
              </strong>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="p-6">
          <div className="overflow-x-auto rounded-xl border border-zinc-200/80">
            <table className="w-full text-xs">
              <thead className="bg-[#00472b] text-white uppercase text-[11px] font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-center w-12">#</th>
                  <th className="py-3 px-4 text-left">Item Description</th>
                  <th className="py-3 px-4 text-center w-24">Qty</th>
                  <th className="py-3 px-4 text-right w-36">Rate (₹)</th>
                  <th className="py-3 px-4 text-right w-40">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {bill.items.map((item, i) => (
                  <tr key={item.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center text-zinc-400 font-mono">{i + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-zinc-900 text-sm">{item.name}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-800">{item.qty}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-zinc-700">₹{item.price.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-950 text-sm">
                      ₹{(item.price * item.qty).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Amount In Words Strip */}
          <div className="mt-4 bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="text-zinc-600">
              <span className="font-bold text-zinc-400 uppercase tracking-wider text-[10px] mr-2">Amount in Words:</span>
              <strong className="text-emerald-900 font-semibold">{wordsAmount}</strong>
            </div>
            <div className="text-zinc-400 text-[11px]">Zero GST &bull; Composite Retail Invoice</div>
          </div>

          {/* Bottom Financial & Dynamic UPI QR Section */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Dynamic UPI QR Code Box */}
            <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 flex items-center gap-4">
              {upiQrUrl ? (
                <div
                  onClick={() => setShowQrModal(true)}
                  className="cursor-pointer group relative shrink-0"
                  title="Click to enlarge Dynamic UPI QR"
                >
                  <img
                    src={upiQrUrl}
                    alt="Dynamic UPI QR"
                    className="w-28 h-28 bg-white p-1 rounded-xl border border-emerald-300 shadow-2xs group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] text-white px-1.5 py-0.5 rounded">
                    Zoom
                  </span>
                </div>
              ) : (
                <div className="w-28 h-28 bg-emerald-100 rounded-xl animate-pulse" />
              )}

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-700 text-white px-2 py-0.5 rounded-full">
                  Dynamic UPI QR
                </span>
                <div className="text-xl font-bold font-mono text-emerald-950">
                  ₹{bill.total.toLocaleString('en-IN')}
                </div>
                <div className="text-xs font-semibold text-zinc-900">ALAKANTI SAI NITHIN</div>
                <div className="text-xs font-mono font-bold text-emerald-800">paytm.s36d65m@pty</div>
                <p className="text-[11px] text-zinc-500">
                  Auto-fills exact bill amount. Scan with PhonePe, Google Pay, Paytm, or BHIM.
                </p>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="bg-white border border-zinc-200/90 rounded-2xl p-5 space-y-2.5 shadow-2xs">
              <div className="flex justify-between text-xs text-zinc-600">
                <span>Subtotal ({bill.items.length} items):</span>
                <span className="font-mono font-semibold">₹{bill.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {bill.discount > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 font-semibold">
                  <span>Special Discount:</span>
                  <span className="font-mono">-₹{bill.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-bold text-zinc-950 border-t border-zinc-200 pt-2">
                <span>Net Total:</span>
                <span className="font-mono text-xl text-[#005a36]">
                  ₹{bill.total.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-xs text-emerald-800 font-semibold">
                <span>Amount Paid:</span>
                <span className="font-mono">₹{(bill.amountPaid || 0).toLocaleString('en-IN')}</span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between text-xs text-rose-600 font-bold border-t border-rose-200 pt-1.5 bg-rose-50/50 px-2 py-1 rounded">
                  <span>Balance Due (Khata):</span>
                  <span className="font-mono">₹{balanceDue.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Dynamic QR Modal */}
      {showQrModal && upiQrUrl && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="text-left">
                <span className="font-bold text-zinc-900 text-xs">Dynamic UPI Payment QR</span>
                <div className="text-[11px] text-zinc-400">Invoice {bill.billNumber}</div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="flex justify-center p-2 bg-white rounded-2xl border border-zinc-200">
              <img
                src={upiQrUrl}
                alt="Dynamic UPI QR"
                className="w-64 h-64 object-contain"
              />
            </div>

            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">
                Pre-Filled Total Amount
              </div>
              <div className="text-2xl font-mono font-bold text-emerald-900">
                ₹{bill.total.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-zinc-600 mt-0.5">
                Payee: <strong>ALAKANTI SAI NITHIN</strong> (paytm.s36d65m@pty)
              </div>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Payment Modal (Transport fields removed) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-base font-bold text-zinc-900">Update Invoice Payment &amp; Khata</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-zinc-400 hover:text-zinc-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Amount Paid (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editAmountPaid}
                    onChange={(e) => setEditAmountPaid(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-emerald-700"
                  />
                  <div className="text-[10px] text-zinc-400 mt-1">Total: ₹{bill.total}</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={editPaymentMode}
                    onChange={(e) => setEditPaymentMode(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-700"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI / Online</option>
                    <option value="card">Card</option>
                    <option value="credit">Credit / Khata</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Payment Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-700"
                >
                  <option value="paid">Paid (Fully Settled)</option>
                  <option value="partial">Partial Payment</option>
                  <option value="pending">Pending (Khata Credit)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Internal Remarks
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes, guarantee details, or customer remarks..."
                  className="w-full border rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUpdate}
                  className="px-4 py-2 bg-[#005a36] hover:bg-[#00472b] text-white rounded-xl text-xs font-bold"
                >
                  {savingUpdate ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
