import { prisma } from './db'

/**
 * Generates serial invoice numbers in the format: MF/YYYY/NNN
 * Examples: MF/2026/001, MF/2026/002, MF/2026/003
 */
export async function generateBillNumber(tx?: any): Promise<string> {
  const db = tx || prisma
  const currentYear = new Date().getFullYear()
  const prefix = `MF/${currentYear}/`

  try {
    // Find all bills for this year that start with MF/YYYY/
    const bills = await db.bill.findMany({
      where: {
        billNumber: {
          startsWith: prefix,
        },
      },
      select: {
        billNumber: true,
      },
    })

    let maxSeq = 0
    for (const b of bills) {
      const parts = b.billNumber.split('/')
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10)
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num
        }
      }
    }

    const nextSeq = maxSeq + 1
    const paddedSeq = String(nextSeq).padStart(3, '0')
    return `${prefix}${paddedSeq}`
  } catch (err) {
    console.error('Error generating serial bill number:', err)
    // Fallback in case of DB read error
    const fallbackSeq = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')
    return `${prefix}${fallbackSeq}`
  }
}
