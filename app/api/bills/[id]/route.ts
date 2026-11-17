import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const bill = await prisma.bill.findUnique({
    where: { id: parseInt(params.id) },
    include: { items: true, customer: true },
  })
  if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(bill)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.billItem.deleteMany({ where: { billId: parseInt(params.id) } })
  await prisma.bill.delete({ where: { id: parseInt(params.id) } })
  return NextResponse.json({ ok: true })
}
