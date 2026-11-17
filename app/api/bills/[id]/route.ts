import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
  }

  try {
    const bill = await prisma.bill.findUnique({
      where: { id: parseInt(params.id) },
      include: { items: true, customer: true },
    })
    if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(bill)
  } catch (error: any) {
    console.error('Bill GET error:', error)
    return NextResponse.json({ error: 'Failed to retrieve bill' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
  }

  try {
    const id = parseInt(params.id)
    const body = await req.json()
    const {
      amountPaid, paymentMode, status, notes, customerName, customerPhone,
      vehicleNumber, driverName, driverPhone, deliveryStatus
    } = body

    const existing = await prisma.bill.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    const paid = amountPaid !== undefined ? parseFloat(amountPaid) : existing.amountPaid
    const calculatedStatus =
      status || (paid >= existing.total ? 'paid' : paid > 0 ? 'partial' : 'pending')

    const updated = await prisma.bill.update({
      where: { id },
      data: {
        amountPaid: paid,
        status: calculatedStatus,
        paymentMode: paymentMode || existing.paymentMode,
        notes: notes !== undefined ? notes : existing.notes,
        customerName: customerName || existing.customerName,
        customerPhone: customerPhone !== undefined ? customerPhone : existing.customerPhone,
        vehicleNumber: vehicleNumber !== undefined ? vehicleNumber : existing.vehicleNumber,
        driverName: driverName !== undefined ? driverName : existing.driverName,
        driverPhone: driverPhone !== undefined ? driverPhone : existing.driverPhone,
        deliveryStatus: deliveryStatus !== undefined ? deliveryStatus : existing.deliveryStatus,
      },
      include: { items: true },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Bill PUT error:', error)
    return NextResponse.json({ error: 'Failed to update bill' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
  }

  try {
    const id = parseInt(params.id)
    await prisma.billItem.deleteMany({ where: { billId: id } })
    await prisma.bill.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Bill DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete bill' }, { status: 500 })
  }
}
