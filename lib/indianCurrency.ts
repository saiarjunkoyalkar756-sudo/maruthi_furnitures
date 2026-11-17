export function numberToWordsIndian(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Rupees Zero Only'
  
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertTwo = (n: number): string => {
    if (n < 20) return ones[n]
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
  }

  const convertThree = (n: number): string => {
    if (n === 0) return ''
    if (n < 100) return convertTwo(n)
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertTwo(n % 100) : '')
  }

  const integerPart = Math.floor(num)
  let n = integerPart

  const crore = Math.floor(n / 10000000)
  n %= 10000000
  const lakh = Math.floor(n / 100000)
  n %= 100000
  const thousand = Math.floor(n / 1000)
  n %= 1000
  const hundreds = Math.floor(n)

  let str = ''
  if (crore) str += convertThree(crore) + ' Crore '
  if (lakh) str += convertThree(lakh) + ' Lakh '
  if (thousand) str += convertThree(thousand) + ' Thousand '
  if (hundreds) str += convertThree(hundreds) + ' '

  const trimmed = str.trim()
  return trimmed ? `Rupees ${trimmed} Only` : 'Rupees Zero Only'
}
