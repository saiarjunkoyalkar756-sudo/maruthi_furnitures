import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') || ''

    const where: any = {}
    if (category && category !== 'All') {
      where.category = category
    }

    const [expenses, bills, billItems] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
      }),
      prisma.bill.findMany({
        select: {
          total: true,
          amountPaid: true,
          subtotal: true,
        },
      }),
      prisma.billItem.findMany({
        select: {
          qty: true,
          price: true,
          costPrice: true,
          total: true,
        },
      }),
    ])

    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    const totalSales = bills.reduce((sum, b) => sum + (b.total || 0), 0)

    // Calculate COGS (Cost of goods sold based on wholesale cost)
    // If billItem has costPrice, use it; otherwise fallback to item total * 0.7
    const totalCOGS = billItems.reduce((sum, item) => {
      const c = item.costPrice > 0 ? item.costPrice * item.qty : item.price * item.qty * 0.65
      return sum + c
    }, 0)

    const grossProfit = totalSales - totalCOGS
    const grossMarginPercent = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0

    const netProfit = grossProfit - totalExpenses
    const overallMarginPercent = totalSales > 0 ? (netProfit / totalSales) * 100 : 0

    // Group expenses by category
    const categoryTotals: Record<string, number> = {}
    for (const e of expenses) {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount
    }

    return NextResponse.json({
      expenses,
      totalExpenses,
      categoryTotals,
      financials: {
        totalSales,
        totalCOGS,
        grossProfit,
        grossMarginPercent,
        totalExpenses,
        netProfit,
        overallMarginPercent,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { category, amount, note, date } = body

    if (!category || !amount) {
      return NextResponse.json({ error: 'Category and amount are required' }, { status: 400 })
    }

    const expense = await prisma.expense.create({
      data: {
        category,
        amount: parseFloat(amount),
        note: note || '',
        date: date ? new Date(date) : new Date(),
      },
    })

    return NextResponse.json(expense, { status: 201 })
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
    await prisma.expense.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

