'use client'
import React from 'react'

interface BillData {
  billNumber: string
  createdAt: string | Date
  customerName: string
  customerPhone?: string
  subtotal: number
  discount: number
  total: number
  amountPaid: number
  paymentMode: string
  status: string
}

export default function ExportCsvButton({ bills }: { bills: BillData[] }) {
  const downloadCsv = () => {
    const headers = [
      'Invoice No',
      'Date',
      'Customer Name',
      'Phone Number',
      'Subtotal (INR)',
      'Discount (INR)',
      'Total Payable (INR)',
      'Amount Received (INR)',
      'Balance Due (INR)',
      'Payment Mode',
      'Payment Status'
    ]

    const rows = bills.map(b => {
      const balance = Math.max(0, b.total - (b.amountPaid || 0))
      const dateStr = new Date(b.createdAt).toLocaleDateString('en-IN')
      return [
        `"${b.billNumber}"`,
        `"${dateStr}"`,
        `"${(b.customerName || '').replace(/"/g, '""')}"`,
        `"${b.customerPhone || ''}"`,
        b.subtotal,
        b.discount || 0,
        b.total,
        b.amountPaid || 0,
        balance,
        `"${b.paymentMode || 'cash'}"`,
        `"${b.status || 'paid'}"`
      ]
    })

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Maruthi_Furnitures_Financial_Report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <button
      onClick={downloadCsv}
      className="bg-slate-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
      title="Download complete transaction spreadsheet for CA / Tax Audit"
    >
      <span>📊</span>
      <span>Export CA Excel (CSV)</span>
    </button>
  )
}
