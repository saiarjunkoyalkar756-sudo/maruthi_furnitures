'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { IconPlus, IconReceipt, IconSearch } from '@/components/Icons'

interface Product {
  id: number
  name: string
  price: number
  costPrice: number
  wholesalePrice: number
  retailPrice: number
  category: string
}

interface QuoteItem {
  productId: number | null
  name: string
  qty: number
  price: number
  costPrice: number
}

export default function NewQuotationPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState<'flat' | 'percent'>('flat')
  const [validDays, setValidDays] = useState('7')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedCat, setSelectedCat] = useState('All')

  useEffect(() => {
    fetch('/api/products?limit=300')
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
  }, [])

  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach(p => { if (p.category) set.add(p.category) })
    return ['All', ...Array.from(set).sort()]
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCat === 'All' || p.category === selectedCat
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
  }, [products, selectedCat, search])

  const handleAddProduct = (prod: Product) => {
    const existingIndex = items.findIndex(i => i.productId === prod.id)
    const itemPrice = prod.retailPrice || prod.price

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
          costPrice: prod.costPrice || 0
        }
      ])
    }
  }

  const addCustomItem = () => {
    setItems([
      ...items,
      { productId: null, name: 'Bespoke Sizing / Custom Piece', qty: 1, price: 0, costPrice: 0 }
    ])
  }

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx))
  }

  const updateItem = (idx: number, key: keyof QuoteItem, val: any) => {
    const updated = [...items]
    ;(updated[idx] as any)[key] = val
    setItems(updated)
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const discountAmt = discountType === 'percent' ? (subtotal * discount) / 100 : discount
  const total = Math.max(0, Math.round(subtotal - discountAmt))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) {
      alert('Please enter customer name')
      return
    }
    if (items.length === 0) {
      alert('Please add at least one furniture or mattress item to the quotation')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          items,
          discount,
          discountType,
          validDays,
          notes
        })
      })
      if (!res.ok) throw new Error('Failed to create estimate')
      router.push('/quotations')
    } catch (err: any) {
      alert('Error: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
            <Link href="/quotations" className="hover:underline text-[#005a36] font-bold">
              ← Quotations Ledger
            </Link>
            <span>/</span>
            <span>New Walk-in Estimate</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create Walk-in Furniture Estimate</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select catalog pieces &bull; Lock prices &bull; WhatsApp proposal PDF directly to customer
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Product Catalog Grid */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="relative">
              <IconSearch className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog by name or category (e.g. Cot, Eurotop, Almirah)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#005a36]"
              />
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedCat === cat
                      ? 'bg-[#005a36] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.slice(0, 18).map(prod => (
              <div
                key={prod.id}
                onClick={() => handleAddProduct(prod)}
                className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs hover:border-[#005a36] hover:shadow-xs cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{prod.category}</div>
                  <div className="font-bold text-slate-900 text-xs mt-0.5 line-clamp-2">{prod.name}</div>
                </div>
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="font-mono font-bold text-[#005a36] text-xs">
                    ₹{prod.price.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] font-bold text-white bg-[#005a36] px-2 py-0.5 rounded-md">
                    + Add
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Estimate Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-sm text-slate-900">Quotation Summary</h3>
            <button
              type="button"
              onClick={addCustomItem}
              className="text-[11px] font-bold text-[#005a36] hover:underline"
            >
              + Custom Item
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#005a36]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">WhatsApp Phone *</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-[#005a36]"
                />
              </div>
            </div>

            {/* Selected Items */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs border border-dashed rounded-xl">
                  Click items on the left to add to estimate
                </div>
              ) : (
                items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                    <input
                      type="text"
                      value={it.name}
                      onChange={(e) => updateItem(idx, 'name', e.target.value)}
                      className="flex-1 bg-white px-2 py-1 rounded border text-xs font-semibold"
                    />
                    <input
                      type="number"
                      min="1"
                      value={it.qty}
                      onChange={(e) => updateItem(idx, 'qty', parseInt(e.target.value) || 1)}
                      className="w-12 bg-white px-2 py-1 rounded border text-center font-bold"
                    />
                    <input
                      type="number"
                      value={it.price}
                      onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                      className="w-20 bg-white px-2 py-1 rounded border text-right font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-rose-500 hover:text-rose-700 font-bold px-1.5"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Discount & Validity */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Showroom Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Proposal Validity</label>
                <select
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
                >
                  <option value="7">7 Days Validity</option>
                  <option value="14">14 Days Validity</option>
                  <option value="30">30 Days Validity</option>
                </select>
              </div>
            </div>

            {/* Total Box */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5 text-xs font-semibold">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#005a36]">
                  <span>Special Discount:</span>
                  <span className="font-mono">-₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t">
                <span>Final Estimate:</span>
                <span className="font-mono text-[#005a36] text-base">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl bg-[#005a36] hover:bg-[#00472b] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <span>{saving ? 'Saving Estimate...' : 'Save Estimate & Generate Proposal PDF'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
