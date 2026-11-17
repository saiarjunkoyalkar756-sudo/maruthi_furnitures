'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { generateQrDataUrl, generateUpiString } from '@/lib/upiQr'
import { IconPlus, IconReceipt, IconQr, IconSearch, IconCheck } from '@/components/Icons'

interface Product {
  id: number
  name: string
  price: number
  costPrice: number
  wholesalePrice: number
  retailPrice: number
  stock: number
  category: string
  unit?: string
}

interface BillItem {
  productId: number | null
  name: string
  qty: number
  price: number
  costPrice: number
}

export default function NewBillPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [pricingType, setPricingType] = useState<'retail' | 'wholesale'>('retail')
  const [items, setItems] = useState<BillItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [amountPaid, setAmountPaid] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState('All')
  const [showUpiModal, setShowUpiModal] = useState(false)
  const [upiQrData, setUpiQrData] = useState('')
  const [qrViewMode, setQrViewMode] = useState<'standee' | 'dynamic'>('standee')

  useEffect(() => {
    fetch('/api/products?limit=300')
      .then((r) => r.json())
      .then((d) => {
        const prods = d.products || []
        setProducts(prods)
      })
  }, [])

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return ['All', ...Array.from(set).sort()]
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCat === 'All' || p.category === selectedCat
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [products, selectedCat, search])

  // When pricing type changes, adjust item rates
  const handlePricingTypeChange = (type: 'retail' | 'wholesale') => {
    setPricingType(type)
    setItems((prev) =>
      prev.map((item) => {
        if (!item.productId) return item
        const p = products.find((prod) => prod.id === item.productId)
        if (!p) return item
        const newPrice =
          type === 'wholesale'
            ? p.wholesalePrice || p.costPrice || p.price
            : p.retailPrice || p.price
        return {
          ...item,
          price: newPrice,
          costPrice: p.wholesalePrice || p.costPrice || 0,
        }
      })
    )
  }

  // 1-Click add product to bill from catalog grid
  const handleAddProduct = (prod: Product) => {
    const existingIndex = items.findIndex((i) => i.productId === prod.id)
    const itemPrice =
      pricingType === 'wholesale'
        ? prod.wholesalePrice || prod.costPrice || prod.price
        : prod.retailPrice || prod.price

    if (existingIndex > -1) {
      const updated = [...items]
      updated[existingIndex].qty += 1
      setItems(updated)
    } else {
      setItems([
        ...items,
        {
          productId: prod.id,
          name: prod.name,
          qty: 1,
          price: itemPrice,
          costPrice: prod.wholesalePrice || prod.costPrice || 0,
        },
      ])
    }
  }

  const addCustomItem = () => {
    setItems([
      ...items,
      { productId: null, name: 'Custom Item / Charge', qty: 1, price: 0, costPrice: 0 },
    ])
  }

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, key: keyof BillItem, val: any) => {
    const updated = [...items]
      ; (updated[idx] as any)[key] = val
    setItems(updated)
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const totalCost = items.reduce((s, i) => s + (i.costPrice || 0) * i.qty, 0)
  const discountAmt = discountType === 'percent' ? (subtotal * discount) / 100 : discount
  const taxable = subtotal - discountAmt
  const total = Math.max(0, Math.round(taxable))
  const estimatedProfit = Math.round(taxable - totalCost)

  const handleOpenUpiModal = async () => {
    const payAmt = amountPaid !== '' ? parseFloat(amountPaid) : total
    if (payAmt <= 0) {
      alert('Total amount must be greater than zero')
      return
    }
    const upiUri = generateUpiString({
      amount: payAmt,
      billNumber: customerName ? `for-${customerName.replace(/\s+/g, '')}` : undefined,
    })
    const qr = await generateQrDataUrl(upiUri)
    setUpiQrData(qr)
    setShowUpiModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) {
      alert('Please enter customer name')
      return
    }
    if (items.length === 0) {
      alert('Please add at least one item to the invoice')
      return
    }
    if (items.some((i) => !i.name || i.price <= 0)) {
      alert('All items must have a name and price')
      return
    }
    setSaving(true)
    try {
      const paid = amountPaid === '' ? total : parseFloat(amountPaid)
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          pricingType,
          items,
          discount,
          discountType,
          paymentMode,
          amountPaid: paid,
          notes,
        }),
      })
      const bill = await res.json()
      router.push(`/billing/${bill.id}`)
    } catch {
      alert('Error saving bill')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Header & Segmented Pricing Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Point of Sale (POS)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click items to add &bull; Automatic serial invoice numbering &bull; Zero GST
          </p>
        </div>

        {/* Pricing Segmented Switch */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 text-xs font-semibold shadow-2xs self-start">
          <button
            type="button"
            onClick={() => handlePricingTypeChange('retail')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${pricingType === 'retail'
                ? 'bg-[#005a36] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Retail Price
          </button>
          <button
            type="button"
            onClick={() => handlePricingTypeChange('wholesale')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${pricingType === 'wholesale'
                ? 'bg-[#005a36] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Wholesale Price
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Section: Visual Catalog Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Category Filter Pills & Search */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="relative">
              <IconSearch className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by name or category (e.g. Cooler, Mattress, Cot)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005a36] transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${selectedCat === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const displayPrice =
                pricingType === 'wholesale'
                  ? p.wholesalePrice || p.costPrice || p.price
                  : p.retailPrice || p.price
              const inCart = items.find((i) => i.productId === p.id)

              return (
                <div
                  key={p.id}
                  onClick={() => handleAddProduct(p)}
                  className={`relative cursor-pointer bg-white rounded-xl border p-3.5 flex flex-col justify-between transition-all hover:shadow-md hover:border-[#005a36] ${inCart ? 'border-[#005a36] ring-1 ring-[#005a36]' : 'border-slate-200/80'
                    }`}
                >
                  {inCart && (
                    <span className="absolute top-2 right-2 bg-[#005a36] text-white text-[10px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                      {inCart.qty}
                    </span>
                  )}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      {p.category}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 mt-0.5 line-clamp-2">
                      {p.name}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold font-mono text-[#005a36]">
                        ₹{displayPrice.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-slate-400">Stock: {p.stock}</div>
                    </div>
                    <button
                      type="button"
                      className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-[#005a36] hover:text-white px-2 py-1 rounded-lg transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={addCustomItem}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
            >
              + Add Custom Item / Repair / Transport Fee
            </button>
          </div>
        </div>

        {/* Right Section: Bill Register / Tape (5 cols, sticky) */}
        <div className="lg:col-span-5 sticky top-16 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            {/* Customer Inputs */}
            <div className="space-y-2 border-b border-slate-100 pb-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Customer Details
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Customer Name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#005a36]"
                  required
                />
                <input
                  type="tel"
                  placeholder="Mobile (WhatsApp)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#005a36]"
                />
              </div>
            </div>

            {/* Selected Items List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Items in Bill ({items.length})</span>
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setItems([])}
                    className="text-[11px] text-rose-600 hover:underline font-normal"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {items.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  Click any product on the left to add to bill
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          @ ₹{item.price.toLocaleString('en-IN')}
                        </div>
                      </div>

                      {/* Qty Steppers */}
                      <div className="flex items-center bg-white border border-slate-200 rounded-md overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.qty <= 1) removeItem(idx)
                            else updateItem(idx, 'qty', item.qty - 1)
                          }}
                          className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 font-bold"
                        >
                          -
                        </button>
                        <span className="px-2 font-mono font-bold text-slate-900">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateItem(idx, 'qty', item.qty + 1)}
                          className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 font-bold"
                        >
                          +
                        </button>
                      </div>

                      {/* Line Total & Remove */}
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">
                          ₹{(item.price * item.qty).toLocaleString('en-IN')}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-[10px] text-rose-500 hover:underline"
                        >
                          remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-bold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {/* Discount Input */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600">Discount:</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex rounded border border-slate-200 overflow-hidden text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDiscountType('flat')}
                      className={`px-1.5 py-0.5 ${discountType === 'flat' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}
                    >
                      ₹
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={`px-1.5 py-0.5 ${discountType === 'percent' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}
                    >
                      %
                    </button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-right"
                  />
                </div>
              </div>

              {/* Grand Total */}
              <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Grand Total
                  </div>
                  <div className="text-[10px] text-emerald-800 font-bold">Zero GST &bull; Tax-Free</div>
                </div>
                <div className="text-2xl font-black font-mono text-slate-950">
                  ₹{total.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700">Payment Mode</label>
              <div className="grid grid-cols-4 gap-1 text-xs">
                {[
                  { id: 'cash', label: 'Cash' },
                  { id: 'upi', label: 'UPI / QR' },
                  { id: 'card', label: 'Card' },
                  { id: 'bank_transfer', label: 'Bank' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMode(m.id)}
                    className={`py-1.5 rounded-lg text-center font-bold text-[11px] border transition-all ${paymentMode === m.id
                        ? 'bg-[#005a36] text-white border-[#005a36] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Paid Now */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-700">Amount Paid Now (₹)</label>
                <button
                  type="button"
                  onClick={() => setAmountPaid(String(total))}
                  className="text-[10px] text-[#005a36] font-bold hover:underline"
                >
                  Pay Full (₹{total.toLocaleString('en-IN')})
                </button>
              </div>
              <input
                type="number"
                placeholder={`Leave blank if full payment`}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#005a36]"
              />
            </div>

            {/* UPI QR Quick Pay Button */}
            <button
              type="button"
              onClick={handleOpenUpiModal}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 flex items-center justify-center gap-2 transition-colors"
            >
              <IconQr className="w-4 h-4 text-emerald-700" />
              <span>Show Counter UPI QR</span>
            </button>

            {/* Generate Invoice CTA */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="w-full py-3 px-4 rounded-xl bg-[#005a36] hover:bg-[#00472b] text-white font-bold text-xs shadow-md shadow-emerald-950/20 disabled:opacity-50 transition-all hover:scale-[1.01]"
            >
              {saving ? 'Creating Serial Invoice...' : 'Complete Sale & Print Invoice'}
            </button>
          </div>
        </div>
      </div>

      {/* Countertop UPI QR Modal */}
      {showUpiModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-center space-y-3.5 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-2.5">
              <div className="text-left">
                <span className="font-bold text-zinc-900 text-xs">Countertop UPI Payment</span>
                <div className="text-[10px] text-zinc-400">ALAKANTI SAI NITHIN</div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpiModal(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {/* View Mode Toggle: Paytm Standee vs Dynamic Amount QR */}
            <div className="flex items-center justify-center gap-1 bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setQrViewMode('standee')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${qrViewMode === 'standee'
                    ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                  }`}
              >
                Paytm Standee
              </button>
              <button
                type="button"
                onClick={() => setQrViewMode('dynamic')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${qrViewMode === 'dynamic'
                    ? 'bg-white text-zinc-900 shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900'
                  }`}
              >
                Dynamic QR (Auto-Amount)
              </button>
            </div>

            {/* QR Content */}
            {qrViewMode === 'standee' ? (
              <div className="space-y-3">
                <div className="relative w-full h-80 rounded-xl overflow-hidden border border-zinc-200 bg-white">
                  <Image
                    src="/paytm-qr.jpg"
                    alt="Official Paytm QR Standee"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
                <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-200 text-center">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Total Payable Amount
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-950">
                    ₹{(amountPaid !== '' ? parseFloat(amountPaid) : total).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-zinc-600 font-mono mt-0.5">
                    paytm.s36d65m@pty
                  </div>
                </div>
              </div>
            ) : upiQrData ? (
              <div className="flex flex-col items-center">
                <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-3 py-1 rounded-full text-[11px] font-bold mb-2.5">
                  Pre-filled Amount QR
                </div>
                <img
                  src={upiQrData}
                  alt="UPI QR"
                  className="w-56 h-56 border border-zinc-200 p-2.5 rounded-2xl bg-white shadow-xs"
                />
                <div className="mt-3 text-2xl font-black text-zinc-900 font-mono">
                  ₹{(amountPaid !== '' ? parseFloat(amountPaid) : total).toLocaleString('en-IN')}
                </div>
                <div className="text-xs font-mono font-bold text-zinc-600 mt-0.5">
                  paytm.s36d65m@pty
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 py-8">Generating Dynamic QR...</p>
            )}

            <button
              type="button"
              onClick={() => setShowUpiModal(false)}
              className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-colors"
            >
              Done / Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
