import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { prisma } from '@/lib/db'
import { generateBillNumber } from '@/lib/billNumber'

const dataDir = path.join(process.cwd(), 'data')
const quotesFile = path.join(dataDir, 'quotations.json')

function getQuotes() {
  if (!fs.existsSync(quotesFile)) return []
  try {
    return JSON.parse(fs.readFileSync(quotesFile, 'utf-8'))
  } catch {
    return []
  }
}

function saveQuotes(quotes: any[]) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  fs.writeFileSync(quotesFile, JSON.stringify(quotes, null, 2))
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const quotes = getQuotes()
  const quote = quotes.find((q: any) => String(q.id) === params.id || q.quoteNumber === params.id)
  if (!quote) {
    return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  }
  return NextResponse.json(quote)
}

// Convert quotation to official bill
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const quotes = getQuotes()
    const quoteIndex = quotes.findIndex((q: any) => String(q.id) === params.id || q.quoteNumber === params.id)
    if (quoteIndex === -1) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    const quote = quotes[quoteIndex]
    const billNumber = await generateBillNumber()

    // Create real Bill in Postgres
    const bill = await prisma.bill.create({
      data: {
        billNumber,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone || '',
        subtotal: quote.subtotal,
        discount: quote.discount || 0,
        discountType: quote.discountType || 'flat',
        cgst: 0,
        sgst: 0,
        total: quote.total,
        amountPaid: 0,
        paymentMode: 'cash',
        status: 'partial',
        notes: `Converted from Estimate ${quote.quoteNumber}. ${quote.notes || ''}`.trim(),
        pricingType: 'retail',
        items: {
          create: quote.items.map((i: any) => ({
            productId: i.productId ? parseInt(i.productId) : null,
            name: i.name,
            qty: parseInt(i.qty) || 1,
            price: parseFloat(i.price) || 0,
            costPrice: parseFloat(i.costPrice) || 0,
            gstRate: 0,
            total: (parseFloat(i.price) || 0) * (parseInt(i.qty) || 1)
          }))
        }
      },
      include: { items: true }
    })

    // Mark quote as converted
    quotes[quoteIndex].status = 'converted'
    quotes[quoteIndex].convertedBillId = bill.id
    quotes[quoteIndex].convertedBillNumber = bill.billNumber
    saveQuotes(quotes)

    return NextResponse.json({ bill, quote: quotes[quoteIndex] })
  } catch (err: any) {
    console.error('Convert quotation error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
