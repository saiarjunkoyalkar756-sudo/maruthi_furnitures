import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateBillNumber } from '@/lib/billNumber'

export async function GET(req: NextRequest) {
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
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    customerName, customerPhone, customerId,
    items, discount, discountType, paymentMode, amountPaid, notes, pricingType,
    vehicleNumber, driverName, driverPhone, deliveryStatus
  } = body

  const subtotal = items.reduce((s: number, i: any) => s + i.price * i.qty, 0)
  const discountAmt = discountType === 'percent'
    ? (subtotal * discount) / 100
    : (discount || 0)
  const cgst = 0
  const sgst = 0
  const total = Math.max(0, subtotal - discountAmt)

  const billNumber = await generateBillNumber()

  const bill = await prisma.bill.create({
    data: {
      billNumber,
      customerName,
      customerPhone: customerPhone || '',
      customerId: customerId || null,
      subtotal,
      discount: discountAmt,
      discountType: discountType || 'flat',
      cgst: 0,
      sgst: 0,
      total,
      amountPaid: amountPaid ?? total,
      paymentMode: paymentMode || 'cash',
      status: (amountPaid ?? total) >= total ? 'paid' : (amountPaid ?? total) > 0 ? 'partial' : 'pending',
      notes: notes || '',
      pricingType: pricingType || 'retail',
      vehicleNumber: vehicleNumber || '',
      driverName: driverName || '',
      driverPhone: driverPhone || '',
      deliveryStatus: deliveryStatus || 'pending',
      items: {
        create: items.map((i: any) => ({
          productId: i.productId || null,
          name: i.name,
          qty: i.qty,
          price: i.price,
          costPrice: i.costPrice || 0,
          gstRate: 0,
          total: i.price * i.qty,
        })),
      },
    },
    include: { items: true },
  })

  // Deduct stock
  for (const item of items) {
    if (item.productId) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.qty } },
      })
    }
  }

  return NextResponse.json(bill)
}
