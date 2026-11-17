// @ts-ignore
import QRCode from 'qrcode'

export const DEFAULT_UPI_VPA = 'paytm.s36d65m@pty'
export const DEFAULT_UPI_NAME = 'ALAKANTI SAI NITHIN'

export function generateUpiString({
  vpa = DEFAULT_UPI_VPA,
  name = DEFAULT_UPI_NAME,
  amount,
  billNumber,
}: {
  vpa?: string
  name?: string
  amount: number
  billNumber?: string
}) {
  const cleanVpa = vpa.trim()
  const cleanName = encodeURIComponent(name.trim())
  const cleanAmt = amount > 0 ? amount.toFixed(2) : '0'
  const note = billNumber ? encodeURIComponent(`Invoice ${billNumber}`) : encodeURIComponent('Maruthi Furnitures')
  return `upi://pay?pa=${cleanVpa}&pn=${cleanName}&am=${cleanAmt}&cu=INR&tn=${note}`
}

export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      margin: 1,
      width: 240,
      color: {
        dark: '#002e6e', // Paytm deep blue for professional shop look
        light: '#ffffff',
      },
    })
  } catch (err) {
    console.error('Error generating QR code:', err)
    return ''
  }
}
