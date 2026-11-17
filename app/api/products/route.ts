import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '200')
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { category: { contains: search } },
        { supplier: { contains: search } },
      ]
    }
    if (category && category !== 'All') {
      where.category = category
    }

    const products = await prisma.product.findMany({
      where,
      take: limit,
      orderBy: { category: 'asc' },
    })

    return NextResponse.json({ products })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const wholesale = parseFloat(body.wholesalePrice || body.costPrice) || 0
    const retail = parseFloat(body.retailPrice || body.price) || 0

    const product = await prisma.product.create({
      data: {
        name: body.name,
        category: body.category || 'General',
        description: body.description || '',
        wholesalePrice: wholesale,
        retailPrice: retail,
        costPrice: wholesale,
        price: retail > 0 ? retail : wholesale,
        gstRate: 0,
        stock: parseInt(body.stock) || 0,
        unit: body.unit || 'piece',
        supplier: body.supplier || '',
        lowStockAt: parseInt(body.lowStockAt) || 3,
      },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const id = parseInt(body.id)
    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const wholesale = parseFloat(body.wholesalePrice ?? body.costPrice)
    const retail = parseFloat(body.retailPrice ?? body.price)

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        category: body.category,
        description: body.description,
        wholesalePrice: !isNaN(wholesale) ? wholesale : undefined,
        retailPrice: !isNaN(retail) ? retail : undefined,
        costPrice: !isNaN(wholesale) ? wholesale : undefined,
        price: !isNaN(retail) ? retail : undefined,
        gstRate: body.gstRate !== undefined ? parseFloat(body.gstRate) : undefined,
        stock: body.stock !== undefined ? parseInt(body.stock) : undefined,
        unit: body.unit,
        supplier: body.supplier,
        lowStockAt: body.lowStockAt !== undefined ? parseInt(body.lowStockAt) : undefined,
      },
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = parseInt(searchParams.get('id') || '')
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }
    await prisma.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
