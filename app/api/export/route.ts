import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""'
  const str = String(val).replace(/"/g, '""')
  return `"${str}"`
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'bills'

    if (type === 'bills') {
      const bills = await prisma.bill.findMany({
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      })

      const headers = [
        'Bill Number',
        'Date',
        'Customer Name',
        'Customer Phone',
        'Items Count',
        'Pricing Type',
        'Subtotal (INR)',
        'Discount (INR)',
        'Total (INR)',
        'Amount Paid (INR)',
        'Balance Due (INR)',
        'Payment Mode',
        'Status',
        'Notes',
      ]

      const rows = bills.map((b) => [
        escapeCsv(b.billNumber),
        escapeCsv(new Date(b.createdAt).toLocaleDateString('en-IN')),
        escapeCsv(b.customerName),
        escapeCsv(b.customerPhone),
        escapeCsv(b.items.length),
        escapeCsv(b.pricingType),
        escapeCsv(b.subtotal),
        escapeCsv(b.discount),
        escapeCsv(b.total),
        escapeCsv(b.amountPaid),
        escapeCsv(Math.max(0, b.total - b.amountPaid)),
        escapeCsv(b.paymentMode),
        escapeCsv(b.status),
        escapeCsv(b.notes),
      ])

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Maruthi_Bills_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    } else if (type === 'products') {
      const products = await prisma.product.findMany({
        orderBy: { category: 'asc' },
      })

      const headers = [
        'Product ID',
        'Product Name',
        'Category',
        'Wholesale Cost (INR)',
        'Retail Price (INR)',
        'Unit Margin (INR)',
        'Margin %',
        'In Stock',
        'Unit',
        'Supplier',
        'Total Wholesale Value',
        'Total Retail Value',
      ]

      const rows = products.map((p) => {
        const wp = p.wholesalePrice || p.costPrice || 0
        const rp = p.retailPrice || p.price || 0
        const margin = rp - wp
        const marginPct = rp > 0 ? (margin / rp) * 100 : 0
        return [
          escapeCsv(p.id),
          escapeCsv(p.name),
          escapeCsv(p.category),
          escapeCsv(wp),
          escapeCsv(rp),
          escapeCsv(margin),
          escapeCsv(marginPct.toFixed(1) + '%'),
          escapeCsv(p.stock),
          escapeCsv(p.unit),
          escapeCsv(p.supplier),
          escapeCsv(wp * p.stock),
          escapeCsv(rp * p.stock),
        ]
      })

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Maruthi_Inventory_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    } else if (type === 'expenses') {
      const expenses = await prisma.expense.findMany({
        orderBy: { date: 'desc' },
      })

      const headers = ['Date', 'Category', 'Amount (INR)', 'Note']

      const rows = expenses.map((e) => [
        escapeCsv(new Date(e.date).toLocaleDateString('en-IN')),
        escapeCsv(e.category),
        escapeCsv(e.amount),
        escapeCsv(e.note),
      ])

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="Maruthi_Expenses_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 })
  }
}
