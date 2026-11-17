import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const inwards = await prisma.stockInward.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { name: true, category: true, stock: true, unit: true },
        },
      },
    })

    return NextResponse.json({ inwards })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { productId, qty, costPrice, supplier, invoiceNo, notes, addToExpenses } = body

    const pId = parseInt(productId)
    const quantity = parseInt(qty)
    const cost = parseFloat(costPrice) || 0

    if (!pId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Valid product and quantity are required' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({ where: { id: pId } })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // 1. Create Stock Inward record
    const inward = await prisma.stockInward.create({
      data: {
        productId: pId,
        qty: quantity,
        costPrice: cost,
        supplier: supplier || product.supplier || '',
        invoiceNo: invoiceNo || '',
        notes: notes || '',
      },
    })

    // 2. Increment Product stock
    const updatedProduct = await prisma.product.update({
      where: { id: pId },
      data: {
        stock: { increment: quantity },
        costPrice: cost > 0 ? cost : undefined,
        wholesalePrice: cost > 0 ? cost : undefined,
        supplier: supplier ? supplier : undefined,
      },
    })

    // 3. Optional: Add as expense
    if (addToExpenses && cost > 0) {
      await prisma.expense.create({
        data: {
          category: 'Stock Purchase',
          amount: quantity * cost,
          note: `Stock Inward: ${quantity}x ${product.name} (${invoiceNo ? 'Inv: ' + invoiceNo : 'Supplier: ' + supplier})`,
        },
      })
    }

    return NextResponse.json({ success: true, inward, updatedProduct }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
