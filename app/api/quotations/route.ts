import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const dataDir = path.join(process.cwd(), 'data')
const quotesFile = path.join(dataDir, 'quotations.json')

function getQuotes() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  if (!fs.existsSync(quotesFile)) {
    fs.writeFileSync(quotesFile, JSON.stringify([], null, 2))
    return []
  }
  try {
    const raw = fs.readFileSync(quotesFile, 'utf-8')
    return JSON.parse(raw)
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = (searchParams.get('search') || '').toLowerCase()
    let quotes = getQuotes()

    if (search) {
      quotes = quotes.filter((q: any) =>
        (q.customerName || '').toLowerCase().includes(search) ||
        (q.customerPhone || '').includes(search) ||
        (q.quoteNumber || '').toLowerCase().includes(search)
      )
    }

    quotes.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return NextResponse.json({ quotes })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customerName, customerPhone, items, discount, discountType, validDays, notes } = body

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Customer name and items are required' }, { status: 400 })
    }

    const subtotal = items.reduce((s: number, i: any) => s + (parseFloat(i.price) || 0) * (parseInt(i.qty) || 1), 0)
    const discountAmt = discountType === 'percent'
      ? (subtotal * (parseFloat(discount) || 0)) / 100
      : (parseFloat(discount) || 0)
    const total = Math.max(0, subtotal - discountAmt)

    const quotes = getQuotes()
    const serial = quotes.length + 1001
    const quoteNumber = `EST-${serial}`

    const days = parseInt(validDays) || 7
    const validUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

    const newQuote = {
      id: Date.now(),
      quoteNumber,
      customerName: String(customerName).trim(),
      customerPhone: customerPhone ? String(customerPhone).trim() : '',
      items,
      subtotal,
      discount: discountAmt,
      discountType: discountType || 'flat',
      total,
      validUntil,
      status: 'active', // 'active', 'converted', 'expired'
      notes: notes || '',
      createdAt: new Date().toISOString()
    }

    quotes.push(newQuote)
    saveQuotes(quotes)

    return NextResponse.json(newQuote)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
