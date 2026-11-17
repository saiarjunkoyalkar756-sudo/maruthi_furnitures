import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
  }

  try {
    const customerId = parseInt(params.id)
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 })
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        bills: {
          orderBy: { createdAt: 'desc' },
          include: { items: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const totalBilled = customer.bills.reduce((sum, b) => sum + b.total, 0)
    const totalPaid = customer.bills.reduce((sum, b) => sum + (b.amountPaid || 0), 0)
    const outstandingBalance = Math.max(0, totalBilled - totalPaid)

    return NextResponse.json({
      customer,
      totalBilled,
      totalPaid,
      outstandingBalance,
      billsCount: customer.bills.length,
    })
  } catch (error: any) {
    console.error('Customer Khata GET error:', error)
    return NextResponse.json({ error: 'Failed to retrieve customer khata' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
  }

  try {
    const customerId = parseInt(params.id)
    const body = await req.json()
    const { amount, note, paymentMode } = body

    const paymentAmt = parseFloat(amount)
    if (!customerId || !paymentAmt || paymentAmt <= 0) {
      return NextResponse.json({ error: 'Valid payment amount is required' }, { status: 400 })
    }

    // 1. Record Customer Payment entry
    const payment = await prisma.customerPayment.create({
      data: {
        customerId,
        amount: paymentAmt,
        type: paymentMode || 'cash',
        note: note || 'Khata settlement payment',
      },
    })

    // 2. Allocate payment to pending / partial bills from oldest to newest
    let remainingToAllocate = paymentAmt
    const pendingBills = await prisma.bill.findMany({
      where: {
        customerId,
        status: { in: ['pending', 'partial'] },
      },
      orderBy: { createdAt: 'asc' },
    })

    for (const bill of pendingBills) {
      if (remainingToAllocate <= 0) break

      const due = bill.total - (bill.amountPaid || 0)
      if (due <= 0) continue

      const alloc = Math.min(remainingToAllocate, due)
      const newPaid = bill.amountPaid + alloc
      const newStatus = newPaid >= bill.total ? 'paid' : 'partial'

      await prisma.bill.update({
        where: { id: bill.id },
        data: {
          amountPaid: newPaid,
          status: newStatus,
        },
      })

      remainingToAllocate -= alloc
    }

    return NextResponse.json({
      success: true,
      payment,
      message: `Recorded payment of ₹${paymentAmt.toLocaleString('en-IN')}`,
    })
  } catch (error: any) {
    console.error('Customer Khata POST error:', error)
    return NextResponse.json({ error: 'Failed to record customer payment' }, { status: 500 })
  }
}
