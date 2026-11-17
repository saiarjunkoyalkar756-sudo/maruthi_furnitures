import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateBillNumber } from '@/lib/billNumber'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const skip = (page - 1) * limit

    const where = search
      ? {
        OR: [
          { billNumber: { contains: search } },
          { customerName: { contains: search } },
          { customerPhone: { contains: search } },
        ],
      }
      : {}

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { items: true },
      }),
      prisma.bill.count({ where }),
    ])

    return NextResponse.json({ bills, total, page, pages: Math.ceil(total / limit) })
  } catch (error: any) {
    console.error('Bills GET error:', error)
    return NextResponse.json({ error: 'Failed to retrieve bills' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      customerName, customerPhone, customerId,
      items, discount, discountType, paymentMode, amountPaid, notes, pricingType,
      vehicleNumber, driverName, driverPhone, deliveryStatus
    } = body

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Customer name and at least one item are required' }, { status: 400 })
    }

    const subtotal = items.reduce((s: number, i: any) => s + (parseFloat(i.price) || 0) * (parseInt(i.qty) || 1), 0)
    const discountAmt = discountType === 'percent'
      ? (subtotal * (parseFloat(discount) || 0)) / 100
      : (parseFloat(discount) || 0)
    const total = Math.max(0, subtotal - discountAmt)
    const parsedPaid = amountPaid !== undefined ? parseFloat(amountPaid) : total

    const billNumber = await generateBillNumber()

    const bill = await prisma.bill.create({
      data: {
        billNumber,
        customerName: String(customerName).trim(),
        customerPhone: customerPhone ? String(customerPhone).trim() : '',
        customerId: customerId ? parseInt(customerId) : null,
        subtotal,
        discount: discountAmt,
        discountType: discountType || 'flat',
        cgst: 0,
        sgst: 0,
        total,
        amountPaid: parsedPaid,
        paymentMode: paymentMode || 'cash',
        status: parsedPaid >= total ? 'paid' : parsedPaid > 0 ? 'partial' : 'pending',
        notes: notes || '',
        pricingType: pricingType || 'retail',
        vehicleNumber: vehicleNumber || '',
        driverName: driverName || '',
        driverPhone: driverPhone || '',
        deliveryStatus: deliveryStatus || 'pending',
        items: {
          create: items.map((i: any) => ({
            productId: i.productId ? parseInt(i.productId) : null,
            name: String(i.name).trim(),
            qty: parseInt(i.qty) || 1,
            price: parseFloat(i.price) || 0,
            costPrice: parseFloat(i.costPrice) || 0,
            gstRate: 0,
            total: (parseFloat(i.price) || 0) * (parseInt(i.qty) || 1),
          })),
        },
      },
      include: { items: true },
    })

    // Deduct stock
    for (const item of items) {
      if (item.productId) {
        await prisma.product.update({
          where: { id: parseInt(item.productId) },
          data: { stock: { decrement: parseInt(item.qty) || 1 } },
        }).catch(() => {})
      }
    }

    return NextResponse.json(bill, { status: 201 })
  } catch (error: any) {
    console.error('Bills POST error:', error)
    return NextResponse.json({ error: 'Failed to create bill' }, { status: 500 })
  }
}
