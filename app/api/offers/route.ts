import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// Blacklist of sample/dummy placeholder numbers to filter out
const DUMMY_PHONES = new Set([
  '9848012345',
  '9866123456',
  '9440234567',
  '9701345678',
  '9989456789',
  '1234567890',
  '9876543210',
  '0000000000',
  '1111111111',
])

function isDummyPhone(phone: string): boolean {
  const p = phone.replace(/\D/g, '').slice(-10)
  if (p.length < 10) return true
  if (DUMMY_PHONES.has(p)) return true
  if (/^(\d)\1{9}$/.test(p)) return true
  return false
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
  }

  try {
    const [offers, dbBills, dbCustomers] = await Promise.all([
      prisma.offer.findMany({
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bill.findMany({
        select: {
          id: true,
          billNumber: true,
          customerName: true,
          customerPhone: true,
          total: true,
          amountPaid: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // Aggregate unique customer phone numbers from BOTH Bills and Customer accounts
    const customerMap = new Map<string, {
      id: string
      name: string
      phone: string
      formattedPhone: string
      totalSpent: number
      billsCount: number
      lastPurchaseDate: string | null
      lastBillNumber: string | null
      source: 'bill' | 'customer'
      hasBalanceDue: boolean
      balanceDue: number
    }>()

    // 1. Process all Bills (Real verified showroom buyers)
    for (const bill of dbBills) {
      if (!bill.customerPhone) continue
      const raw = bill.customerPhone.trim()
      const digits = raw.replace(/\D/g, '')
      const cleanPhone = digits.length >= 10 ? digits.slice(-10) : digits
      if (!cleanPhone || cleanPhone.length < 10 || isDummyPhone(cleanPhone)) continue

      const due = Math.max(0, (bill.total || 0) - (bill.amountPaid || 0))

      if (!customerMap.has(cleanPhone)) {
        customerMap.set(cleanPhone, {
          id: `bill-${bill.id}`,
          name: bill.customerName?.trim() || 'Showroom Customer',
          phone: cleanPhone,
          formattedPhone: `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`,
          totalSpent: bill.total || 0,
          billsCount: 1,
          lastPurchaseDate: bill.createdAt.toISOString(),
          lastBillNumber: bill.billNumber,
          source: 'bill',
          hasBalanceDue: due > 0,
          balanceDue: due,
        })
      } else {
        const existing = customerMap.get(cleanPhone)!
        existing.totalSpent += bill.total || 0
        existing.billsCount += 1
        existing.balanceDue += due
        if (due > 0) existing.hasBalanceDue = true
        // Keep most descriptive name if previously generic
        if (existing.name === 'Showroom Customer' && bill.customerName) {
          existing.name = bill.customerName.trim()
        }
      }
    }

    // 2. Merge registered Khata Customers
    for (const cust of dbCustomers) {
      if (!cust.phone) continue
      const raw = cust.phone.trim()
      const digits = raw.replace(/\D/g, '')
      const cleanPhone = digits.length >= 10 ? digits.slice(-10) : digits
      if (!cleanPhone || cleanPhone.length < 10 || isDummyPhone(cleanPhone)) continue

      if (!customerMap.has(cleanPhone)) {
        customerMap.set(cleanPhone, {
          id: `cust-${cust.id}`,
          name: cust.name?.trim() || 'Khata Customer',
          phone: cleanPhone,
          formattedPhone: `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`,
          totalSpent: 0,
          billsCount: 0,
          lastPurchaseDate: cust.createdAt?.toISOString() || null,
          lastBillNumber: null,
          source: 'customer',
          hasBalanceDue: false,
          balanceDue: 0,
        })
      } else {
        const existing = customerMap.get(cleanPhone)!
        if (cust.name && cust.name !== 'Showroom Customer') {
          existing.name = cust.name.trim()
        }
      }
    }

    const customers = Array.from(customerMap.values()).sort((a, b) => {
      // Prioritize customers who have billed purchases first, then by total spent
      if (b.billsCount !== a.billsCount) return b.billsCount - a.billsCount
      return b.totalSpent - a.totalSpent
    })

    return NextResponse.json({
      offers,
      customers,
      totalCustomers: customers.length,
      billedCustomersCount: customers.filter((c) => c.billsCount > 0).length,
    })
  } catch (error: any) {
    console.error('Offers GET error:', error)
    return NextResponse.json({ error: 'Failed to retrieve offers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, message, discountPercent, validTill } = body

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
    }

    // Query all bills and customers to get accurate recipient count
    const [dbBills, dbCustomers] = await Promise.all([
      prisma.bill.findMany({ select: { customerPhone: true } }),
      prisma.customer.findMany({ select: { phone: true } }),
    ])

    const phones = new Set<string>()
    for (const b of dbBills) {
      if (b.customerPhone) {
        const d = b.customerPhone.replace(/\D/g, '')
        if (d.length >= 10) {
          const num = d.slice(-10)
          if (!isDummyPhone(num)) phones.add(num)
        }
      }
    }
    for (const c of dbCustomers) {
      if (c.phone) {
        const d = c.phone.replace(/\D/g, '')
        if (d.length >= 10) {
          const num = d.slice(-10)
          if (!isDummyPhone(num)) phones.add(num)
        }
      }
    }

    const offer = await prisma.offer.create({
      data: {
        title: String(title).trim(),
        message: String(message).trim(),
        discountPercent: parseFloat(discountPercent) || 0,
        validTill: validTill ? new Date(validTill) : null,
        sentCount: phones.size,
      },
    })

    return NextResponse.json({
      success: true,
      offer,
      recipientCount: phones.size,
    })
  } catch (error: any) {
    console.error('Offers POST error:', error)
    return NextResponse.json({ error: 'Failed to create offer' }, { status: 500 })
  }
}
