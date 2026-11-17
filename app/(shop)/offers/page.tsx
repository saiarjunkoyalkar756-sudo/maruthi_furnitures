'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import {
  IconBroadcast,
  IconUsers,
  IconCheck,
  IconArrowRight,
  IconReceipt,
  IconDownload,
  IconPlus,
} from '@/components/Icons'

interface CustomerAudience {
  id: string
  name: string
  phone: string
  formattedPhone: string
  totalSpent: number
  billsCount: number
  lastPurchaseDate: string | null
  lastBillNumber: string | null
  source: 'bill' | 'customer'
  hasBalanceDue: boolean
  balanceDue: number
}

interface Offer {
  id: number
  title: string
  message: string
  discountPercent: number
  validTill: string | null
  sentCount: number
  createdAt: string
}

const TEMPLATES = [
  {
    name: 'Festival Furniture & Mattress Sale',
    tag: 'Festival Promo',
    title: 'Festive Mega Discount — Maruthi Furnitures Siddipet',
    discount: '25',
    message:
      'Dear {name},\n\nSpecial Festive Sale at *MARUTHI FURNITURES & MATTRESSES*! 🛋️✨\n\nEnjoy up to 25% OFF on Premium Sofas, Orthopedic Mattresses, Teak Wood Cots, and Steel Almirahs this week.\n\n📍 Visit our showroom: Bypass Road, Mytri Vanam, Beside RS Metro Garden, Siddipet\n📞 Contact: +91 9908267125\n\nShow this message at the counter to claim your exclusive discount!',
  },
  {
    name: 'New Stock Arrival (Sofas & Cots)',
    tag: 'New Arrivals',
    title: 'Fresh Showroom Stock Available Now',
    discount: '15',
    message:
      'Dear {name},\n\nFresh new season furniture models just arrived at *MARUTHI FURNITURES*! 🪑\n\nExplore our latest 2026 designer sofa collections, dressing tables, luxury dining sets, and energy-efficient air coolers at unbeatable wholesale prices.\n\n📍 Bypass Road, Siddipet\n📞 Call/WhatsApp: +91 9908267125 for catalog photos & home delivery!',
  },
  {
    name: 'Repeat Buyer Privilege Offer',
    tag: 'VIP Customer',
    title: 'Exclusive Showroom Privilege for Valued Customers',
    discount: '20',
    message:
      'Dear {name},\n\nAs a valued customer of *Maruthi Furnitures*, you have unlocked an exclusive 20% loyalty discount on your next home upgrade or mattress replacement!\n\nZero GST & direct factory rates.\n📍 Siddipet Bypass Road | Ph: +91 9908267125',
  },
  {
    name: 'Khata Due / Balance Reminder',
    tag: 'Payment Reminder',
    title: 'Friendly Ledger Balance Reminder',
    discount: '0',
    message:
      'Dear {name},\n\nGreetings from *MARUTHI FURNITURES & MATTRESSES*.\n\nThis is a gentle reminder regarding your pending invoice balance of ₹{balance}. Kindly settle via UPI to: paytm.s36d65m@pty (ALAKANTI SAI NITHIN) or visit our showroom.\n\nThank you for your continuous trust & support!\n📞 Contact: +91 9908267125',
  },
]

export default function OffersBroadcastPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [customers, setCustomers] = useState<CustomerAudience[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'billed' | 'high' | 'credit'>('all')
  const [searchPhone, setSearchPhone] = useState('')
  const [copiedNumbers, setCopiedNumbers] = useState(false)

  // Image Upload states
  const [offerImage, setOfferImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form states
  const [title, setTitle] = useState(TEMPLATES[0].title)
  const [message, setMessage] = useState(TEMPLATES[0].message)
  const [discountPercent, setDiscountPercent] = useState(TEMPLATES[0].discount)
  const [validTill, setValidTill] = useState('')
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0)

  const fetchOffers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/offers')
      const data = await res.json()
      setOffers(data.offers || [])
      setCustomers(data.customers || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOffers()
  }, [])

  const selectTemplate = (idx: number) => {
    setSelectedTemplateIndex(idx)
    const t = TEMPLATES[idx]
    setTitle(t.title)
    setMessage(t.message)
    setDiscountPercent(t.discount)
  }

  // Handle Image File Upload
  const handleImageFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPEG, PNG, WebP)')
      return
    }
    setUploadingImage(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/offers/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setOfferImage(data.url)
    } catch (err: any) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0])
    }
  }

  // Filter Audience
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        !searchPhone ||
        c.name.toLowerCase().includes(searchPhone.toLowerCase()) ||
        c.phone.includes(searchPhone)

      if (!matchSearch) return false

      if (audienceFilter === 'billed') return c.billsCount > 0
      if (audienceFilter === 'high') return c.totalSpent >= 5000
      if (audienceFilter === 'credit') return c.hasBalanceDue
      return true
    })
  }, [customers, audienceFilter, searchPhone])

  const billedCount = customers.filter((c) => c.billsCount > 0).length
  const highSpenderCount = customers.filter((c) => c.totalSpent >= 5000).length
  const creditCount = customers.filter((c) => c.hasBalanceDue).length

  // Copy phone numbers for WhatsApp broadcast list
  const handleCopyAllNumbers = () => {
    const list = filteredCustomers.map((c) => c.phone).join(', ')
    navigator.clipboard.writeText(list)
    setCopiedNumbers(true)
    setTimeout(() => setCopiedNumbers(false), 3000)
  }

  // Open individual personalized WhatsApp chat
  const openPersonalizedWhatsApp = (customer: CustomerAudience) => {
    let personalized = message.replace(/{name}/g, customer.name || 'Valued Customer')
    personalized = personalized.replace(/{balance}/g, customer.balanceDue.toLocaleString('en-IN'))
    personalized = personalized.replace(/{bill}/g, customer.lastBillNumber || 'Recent Purchase')

    if (offerImage) {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      personalized += `\n\n🖼️ *Offer Poster:* ${origin}${offerImage}`
    }

    const cleanPhone = customer.phone.replace(/\D/g, '')
    const targetUrl = `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(personalized)}`
    window.open(targetUrl, '_blank')
  }

  // Save campaign to history
  const handleBroadcastRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) {
      alert('Please enter an offer message')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          message,
          discountPercent,
          validTill: validTill || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to record campaign')
      alert(`Campaign "${title}" recorded! You can now send messages to the ${filteredCustomers.length} targeted customers below.`)
      fetchOffers()
    } catch (err: any) {
      alert('Error recording offer: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Showroom WhatsApp Marketing Master Header */}
      <div className="bg-gradient-to-r from-[#00472b] via-[#003822] to-[#002717] border-b-4 border-[#e5a919] p-6 rounded-2xl text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 bg-white/10 rounded-xl border border-white/20 flex items-center justify-center shrink-0">
            <IconBroadcast className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                WhatsApp Broadcast &amp; Posters
              </span>
              <span className="text-xs text-emerald-200/80 font-mono">
                {customers.length} Verified Contacts
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Customer Offers &amp; Image Marketing
            </h1>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              Drop offer posters, craft discount flyers, and broadcast to real customers from bills.
            </p>
          </div>
        </div>

        {/* Live Audience Stat Pills */}
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs p-2 rounded-xl border border-white/15 text-xs">
          <div className="text-center px-3 py-1 border-r border-white/10">
            <div className="text-base font-bold font-mono text-emerald-300">{customers.length}</div>
            <div className="text-[10px] text-zinc-300 uppercase">Total Contacts</div>
          </div>
          <div className="text-center px-3 py-1">
            <div className="text-base font-bold font-mono text-amber-300">{billedCount}</div>
            <div className="text-[10px] text-zinc-300 uppercase">Billed Buyers</div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Template, Poster Dropzone & Composer (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                1. Select Offer Template
              </h2>
              <span className="text-[10px] text-zinc-400">1-Click load</span>
            </div>

            {/* Template Selector Pills */}
            <div className="space-y-2">
              {TEMPLATES.map((tmpl, idx) => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => selectTemplate(idx)}
                  className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                    selectedTemplateIndex === idx
                      ? 'border-[#005a36] bg-emerald-50/70 font-semibold text-zinc-950 shadow-2xs'
                      : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-zinc-900">{tmpl.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-zinc-200 text-emerald-800">
                      {tmpl.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 line-clamp-1">{tmpl.title}</p>
                </button>
              ))}
            </div>

            {/* Customizer Form */}
            <form onSubmit={handleBroadcastRecord} className="space-y-3.5 pt-2 border-t">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Campaign Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Discount %</label>
                  <input
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs font-mono"
                    placeholder="e.g. 20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Valid Till (Optional)</label>
                  <input
                    type="date"
                    value={validTill}
                    onChange={(e) => setValidTill(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* IMAGE UPLOAD & DROPZONE FOR OFFERS */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center justify-between">
                  <span>Offer Poster / Flyer Image</span>
                  {offerImage && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Poster Attached
                    </span>
                  )}
                </label>

                {offerImage ? (
                  <div className="relative rounded-2xl border border-zinc-200 bg-zinc-50 p-3 flex items-center gap-3">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-200 bg-white shrink-0 shadow-xs">
                      <Image
                        src={offerImage}
                        alt="Offer Poster"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="font-bold text-zinc-900 truncate">Offer Image Ready</div>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                        Link auto-appended to WhatsApp messages
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <a
                          href={offerImage}
                          download="Maruthi_Offer.jpg"
                          className="text-[11px] text-emerald-800 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <IconDownload className="w-3 h-3" />
                          <span>Download</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setOfferImage(null)}
                          className="text-[11px] text-rose-600 font-bold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-zinc-300 hover:border-emerald-600 hover:bg-zinc-50/80'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleImageFile(e.target.files[0])
                        }
                      }}
                    />

                    {uploadingImage ? (
                      <div className="py-2 text-xs text-emerald-800 font-bold animate-pulse">
                        Uploading offer image...
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-zinc-800">
                          Drop offer poster here, or <span className="text-emerald-800 underline">browse</span>
                        </div>
                        <p className="text-[10px] text-zinc-400">
                          Supports PNG, JPG, WebP photos of furniture, discounts, or cots
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Message Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-zinc-700">WhatsApp Message Body</label>
                  <span className="text-[10px] text-zinc-400">Supports *bold*, emojis</span>
                </div>
                <textarea
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl p-3 text-xs font-sans leading-relaxed focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  required
                />
                <div className="text-[10px] text-zinc-400 mt-1">
                  Tags: <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-700">&#123;name&#125;</code>, <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-700">&#123;balance&#125;</code>, <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-700">&#123;bill&#125;</code>
                </div>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full py-2.5 px-4 rounded-xl bg-[#005a36] hover:bg-[#00472b] text-white text-xs font-bold transition-all shadow-xs"
              >
                {sending ? 'Saving Campaign...' : 'Save Broadcast Campaign'}
              </button>
            </form>
          </div>

          {/* Past Broadcast History */}
          {offers.length > 0 && (
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 mb-3">
                Campaign History ({offers.length})
              </h3>
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {offers.map((off) => (
                  <div key={off.id} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
                    <div className="flex justify-between items-start font-bold text-zinc-900">
                      <span>{off.title}</span>
                      <span className="text-emerald-800 font-mono text-[11px]">
                        {off.discountPercent}% OFF
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1 flex justify-between">
                      <span>{new Date(off.createdAt).toLocaleDateString('en-IN')}</span>
                      <span>Targeted {off.sentCount} customers</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Real Customer Audience Table (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden">
            {/* Audience Toolbar */}
            <div className="p-5 border-b border-zinc-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-tight flex items-center gap-2">
                    <IconUsers className="w-4 h-4 text-emerald-800" />
                    <span>Real Customer Contacts ({filteredCustomers.length})</span>
                  </h2>
                  <p className="text-[11px] text-zinc-500">
                    Real numbers extracted from showroom counter bills &amp; khata profiles.
                  </p>
                </div>

                {/* Batch Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyAllNumbers}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors shadow-2xs"
                    title="Copy all filtered phone numbers for WhatsApp Broadcast"
                  >
                    {copiedNumbers ? (
                      <>
                        <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied ({filteredCustomers.length})!</span>
                      </>
                    ) : (
                      <>
                        <span>Copy Numbers</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-100 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setAudienceFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      audienceFilter === 'all'
                        ? 'bg-white text-zinc-950 shadow-2xs font-bold'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    All ({customers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceFilter('billed')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      audienceFilter === 'billed'
                        ? 'bg-white text-zinc-950 shadow-2xs font-bold'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    Billed Buyers ({billedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceFilter('high')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      audienceFilter === 'high'
                        ? 'bg-white text-zinc-950 shadow-2xs font-bold'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    High Spenders ({highSpenderCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAudienceFilter('credit')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      audienceFilter === 'credit'
                        ? 'bg-white text-zinc-950 shadow-2xs font-bold'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    Due Balances ({creditCount})
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search name or phone..."
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    className="w-full sm:w-48 pl-3 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
              </div>
            </div>

            {/* Customers Table */}
            {loading ? (
              <div className="p-12 text-center text-zinc-400 text-xs">Loading customer contacts...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 text-xs">
                No matching customer numbers found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-5 py-3">Customer</th>
                      <th className="text-left px-5 py-3">Phone Number</th>
                      <th className="text-right px-5 py-3">Total Invoiced</th>
                      <th className="text-center px-5 py-3">Source</th>
                      <th className="text-right px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-zinc-50/70 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-zinc-900">{cust.name}</div>
                          {cust.billsCount > 0 && (
                            <div className="text-[10px] text-emerald-800 font-semibold">
                              {cust.billsCount} bill{cust.billsCount > 1 ? 's' : ''} &bull; Last: {cust.lastBillNumber || 'Recent'}
                            </div>
                          )}
                          {cust.hasBalanceDue && (
                            <div className="text-[10px] text-rose-600 font-bold">
                              ₹{cust.balanceDue.toLocaleString('en-IN')} pending
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5 font-mono text-zinc-900 font-semibold whitespace-nowrap">
                          {cust.formattedPhone}
                        </td>

                        <td className="px-5 py-3.5 text-right font-mono font-bold text-zinc-900">
                          {cust.totalSpent > 0 ? (
                            `₹${cust.totalSpent.toLocaleString('en-IN')}`
                          ) : (
                            <span className="text-zinc-400 font-normal">Khata profile</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              cust.source === 'bill'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                            }`}
                          >
                            {cust.source === 'bill' ? '🧾 Bill Buyer' : 'Khata'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openPersonalizedWhatsApp(cust)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] transition-colors shadow-2xs"
                            title={`Send WhatsApp message with poster to ${cust.name}`}
                          >
                            <span>Send WhatsApp</span>
                            <IconArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
