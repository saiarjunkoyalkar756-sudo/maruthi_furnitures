'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { IconSearch } from '@/components/Icons'

interface Product {
  id: number
  name: string
  category: string
  description?: string
  wholesalePrice: number
  retailPrice: number
  costPrice: number
  price: number
  gstRate: number
  stock: number
  unit: string
  supplier: string
  lowStockAt: number
}

const DEFAULT_CATEGORIES = [
  'Air Cooler',
  'Dressing Table',
  'Mattress',
  'Almirah',
  'Sofa Cushions',
]

const POPULAR_SUGGESTIONS = [
  'Sofa Set',
  'Wooden Cot',
  'Steel Cot',
  'Dining Table',
  'Office Chair',
  'Pillow & Cushion',
  'Cupboard & Wardrobe',
  'Coffee Table',
  'Plastic Chairs',
  'Study Table',
]

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false)

  // Stock Inward states
  const [showInwardModal, setShowInwardModal] = useState(false)
  const [inwardProductId, setInwardProductId] = useState<number | null>(null)
  const [inwardQty, setInwardQty] = useState('5')
  const [inwardCost, setInwardCost] = useState('')
  const [inwardSupplier, setInwardSupplier] = useState('')
  const [inwardInvoiceNo, setInwardInvoiceNo] = useState('')
  const [inwardAddExpense, setInwardAddExpense] = useState(true)
  const [savingInward, setSavingInward] = useState(false)

  // Form states for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    category: 'Air Cooler',
    description: '',
    wholesalePrice: '',
    retailPrice: '',
    stock: '',
    unit: 'piece',
    supplier: 'Maruthi Steel Furniture Works',
    gstRate: '0',
    lowStockAt: '2',
  })

  // Load custom categories from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('maruthi_custom_categories')
      if (saved) {
        setCustomCategories(JSON.parse(saved))
      }
    } catch { }
  }, [])

  // Combined list of all categories
  const allCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES)
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim())
      }
    })
    customCategories.forEach((c) => {
      if (c && c.trim()) {
        set.add(c.trim())
      }
    })
    return Array.from(set).sort()
  }, [products, customCategories])

  const handleAddNewCategory = (catName: string) => {
    const trimmed = catName.trim()
    if (!trimmed) return
    if (!customCategories.includes(trimmed)) {
      const updated = [...customCategories, trimmed]
      setCustomCategories(updated)
      try {
        localStorage.setItem('maruthi_custom_categories', JSON.stringify(updated))
      } catch { }
    }
    setSelectedCategory(trimmed)
    setShowAddCategoryModal(false)
    setNewCatInput('')
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/products?limit=200')
      const data = await res.json()
      setProducts(data.products || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        p.supplier.toLowerCase().includes(search.toLowerCase())
      const matchesCategory =
        selectedCategory === 'All' || p.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, search, selectedCategory])

  // Aggregate Stats
  const stats = useMemo(() => {
    let totalStock = 0
    let totalWholesaleVal = 0
    let totalRetailVal = 0
    let lowStockCount = 0

    for (const p of products) {
      const stock = p.stock || 0
      const wp = p.wholesalePrice || p.costPrice || 0
      const rp = p.retailPrice || p.price || 0
      totalStock += stock
      totalWholesaleVal += wp * stock
      totalRetailVal += rp * stock
      if (stock <= (p.lowStockAt || 2)) {
        lowStockCount++
      }
    }

    const potentialMargin = totalRetailVal - totalWholesaleVal
    const potentialMarginPct =
      totalRetailVal > 0 ? (potentialMargin / totalRetailVal) * 100 : 0

    return {
      count: products.length,
      totalStock,
      totalWholesaleVal,
      totalRetailVal,
      potentialMargin,
      potentialMarginPct,
      lowStockCount,
    }
  }, [products])

  const openAddModal = () => {
    setEditingProduct(null)
    setIsCustomCategoryMode(false)
    setFormData({
      name: '',
      category: selectedCategory !== 'All' ? selectedCategory : (allCategories[0] || 'Air Cooler'),
      description: '',
      wholesalePrice: '',
      retailPrice: '',
      stock: '5',
      unit: 'piece',
      supplier: 'Maruthi Steel Furniture Works',
      gstRate: '0',
      lowStockAt: '2',
    })
    setShowAddModal(true)
  }

  const openEditModal = (p: Product) => {
    setEditingProduct(p)
    setIsCustomCategoryMode(false)
    setFormData({
      name: p.name,
      category: p.category,
      description: p.description || '',
      wholesalePrice: String(p.wholesalePrice || p.costPrice || 0),
      retailPrice: String(p.retailPrice || p.price || 0),
      stock: String(p.stock),
      unit: p.unit || 'piece',
      supplier: p.supplier || '',
      gstRate: '0',
      lowStockAt: String(p.lowStockAt || 2),
    })
    setShowAddModal(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const catToSave = formData.category.trim() || 'General'

      // Save category to customCategories if not already present
      if (!allCategories.includes(catToSave)) {
        handleAddNewCategory(catToSave)
      }

      if (editingProduct) {
        // Update product
        await fetch('/api/products', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingProduct.id,
            ...formData,
            category: catToSave,
            wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
            retailPrice: parseFloat(formData.retailPrice) || 0,
            stock: parseInt(formData.stock) || 0,
            lowStockAt: parseInt(formData.lowStockAt) || 2,
            gstRate: 0,
          }),
        })
      } else {
        // Create product
        await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            category: catToSave,
            wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
            retailPrice: parseFloat(formData.retailPrice) || 0,
            stock: parseInt(formData.stock) || 0,
            lowStockAt: parseInt(formData.lowStockAt) || 2,
            gstRate: 0,
          }),
        })
      }
      setShowAddModal(false)
      fetchProducts()
    } catch (err) {
      alert('Error saving product: ' + err)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveInward = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inwardProductId) {
      alert('Please select a product')
      return
    }
    setSavingInward(true)
    try {
      const res = await fetch('/api/stock-inward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: inwardProductId,
          qty: parseInt(inwardQty) || 1,
          costPrice: parseFloat(inwardCost) || 0,
          supplier: inwardSupplier,
          invoiceNo: inwardInvoiceNo,
          addToExpenses: inwardAddExpense,
        }),
      })
      if (!res.ok) throw new Error('Failed to record stock inward')
      setShowInwardModal(false)
      fetchProducts()
    } catch (err: any) {
      alert('Error recording stock inward: ' + err.message)
    } finally {
      setSavingInward(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    try {
      await fetch(`/api/products?id=${id}`, { method: 'DELETE' })
      fetchProducts()
    } catch (err) {
      alert('Error deleting: ' + err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 tracking-tight">Products &amp; Inventory</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {products.length} products &bull; Dual pricing &bull; Stock valuation
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start">
          <a
            href="/api/export?type=products"
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors shadow-2xs"
          >
            Export CSV
          </a>

          <button
            onClick={() => {
              if (products.length > 0) {
                setInwardProductId(products[0].id)
                setInwardCost(String(products[0].wholesalePrice || products[0].costPrice || ''))
                setInwardSupplier(products[0].supplier || '')
              }
              setShowInwardModal(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-700 transition-colors shadow-2xs"
          >
            Inward Stock
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-zinc-900 hover:bg-black text-xs font-medium text-white transition-colors shadow-2xs"
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* Analytics Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Wholesale Value
          </div>
          <div className="text-xl font-semibold text-zinc-950 mt-1 font-mono">
            ₹{stats.totalWholesaleVal.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">{stats.totalStock} units in stock</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Retail Value
          </div>
          <div className="text-xl font-semibold text-zinc-950 mt-1 font-mono">
            ₹{stats.totalRetailVal.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">Catalog selling price</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Net Margin Potential
          </div>
          <div className="text-xl font-semibold text-emerald-700 mt-1 font-mono">
            ₹{stats.potentialMargin.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-0.5">
            +{stats.potentialMarginPct.toFixed(1)}% margin
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
            Low Stock Alerts
          </div>
          <div className="text-xl font-semibold text-amber-700 mt-1 font-mono">
            {stats.lowStockCount} <span className="text-xs font-normal text-zinc-500">items</span>
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">&le; 2 units remaining</div>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="bg-white p-3.5 rounded-xl border border-zinc-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <IconSearch className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search product, category, size or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-md text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-950"
            />
          </div>
          <div className="text-xs text-gray-500 font-medium">
            Showing <strong className="text-gray-900">{filteredProducts.length}</strong> of {products.length} products
          </div>
        </div>

        {/* Category Tabs & Add Category Button */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          {['All', ...allCategories].map((cat) => {
            const count =
              cat === 'All'
                ? products.length
                : products.filter((p) => p.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${selectedCategory === cat
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <span>{cat}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedCategory === cat
                    ? 'bg-blue-800 text-blue-100'
                    : 'bg-gray-200 text-gray-700'
                    }`}
                >
                  {count}
                </span>
              </button>
            )
          })}

          {/* Quick Add Custom Category Button */}
          <button
            onClick={() => setShowAddCategoryModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1 shadow-sm"
            title="Create a new custom product category"
          >
            <span>+</span>
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            No products match your search or category filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3.5">Product &amp; Category</th>
                  <th className="text-right px-4 py-3.5 bg-amber-50/50 text-amber-900">Wholesale (Cost)</th>
                  <th className="text-right px-4 py-3.5 bg-blue-50/50 text-blue-900">Retail Price</th>
                  <th className="text-right px-4 py-3.5 text-emerald-800">Margin (₹ / %)</th>
                  <th className="text-center px-4 py-3.5">Stock</th>
                  <th className="text-left px-4 py-3.5">Supplier</th>
                  <th className="text-right px-4 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((p) => {
                  const wp = p.wholesalePrice || p.costPrice || 0
                  const rp = p.retailPrice || p.price || 0
                  const marginAmt = rp - wp
                  const marginPct = rp > 0 ? (marginAmt / rp) * 100 : 0
                  const isLowStock = p.stock <= (p.lowStockAt || 2)

                  return (
                    <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* Name & Category */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-gray-900">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                            {p.category}
                          </span>
                          {p.description && (
                            <span className="text-[11px] text-gray-400 truncate max-w-xs">
                              {p.description}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Wholesale Price */}
                      <td className="px-4 py-3.5 text-right font-mono font-medium text-amber-900 bg-amber-50/30">
                        ₹{wp.toLocaleString('en-IN')}
                      </td>

                      {/* Retail Price */}
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-blue-700 bg-blue-50/30">
                        ₹{rp.toLocaleString('en-IN')}
                      </td>

                      {/* Margin Column */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="font-semibold text-emerald-600 font-mono">
                          +₹{marginAmt.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] font-medium text-emerald-700">
                          {marginPct.toFixed(1)}% margin
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${isLowStock
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800'
                            }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                        {isLowStock && (
                          <div className="text-[10px] text-amber-700 mt-0.5 font-medium">Low stock!</div>
                        )}
                      </td>

                      {/* Supplier */}
                      <td className="px-4 py-3.5 text-xs text-gray-500">
                        {p.supplier || '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(p)}
                            className="text-xs bg-gray-100 hover:bg-blue-100 text-blue-700 font-medium px-2.5 py-1 rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">
                {editingProduct ? 'Edit Product Details' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. 75x36x5 32D Mattress"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategoryMode(!isCustomCategoryMode)
                        if (!isCustomCategoryMode) {
                          setFormData({ ...formData, category: '' })
                        } else {
                          setFormData({ ...formData, category: allCategories[0] || 'General' })
                        }
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline"
                    >
                      {isCustomCategoryMode ? '← Pick from list' : '+ New Category'}
                    </button>
                  </div>

                  {isCustomCategoryMode ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g. Sofa Set, Wooden Cot, Dining Table..."
                        className="w-full border-2 border-emerald-500 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-900 bg-emerald-50/40 focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                      />
                      {/* Quick suggestions chips */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        <span className="text-[10px] text-gray-400 self-center">Suggestions:</span>
                        {POPULAR_SUGGESTIONS.slice(0, 5).map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setFormData({ ...formData, category: sug })}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 hover:bg-emerald-100 text-gray-700 hover:text-emerald-800 border border-gray-200 transition-colors"
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCustomCategoryMode(true)
                          setFormData({ ...formData, category: '' })
                        } else {
                          setFormData({ ...formData, category: e.target.value })
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {allCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="__NEW__">➕ + Add New Custom Category...</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="piece, set, etc."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Wholesale vs Retail Price */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    Wholesale Price (Cost ₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.wholesalePrice}
                    onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                    placeholder="e.g. 3500"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono font-semibold focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-gray-500">Purchase / Dealer rate</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-900 mb-1">
                    Retail Price (Sales ₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.retailPrice}
                    onChange={(e) => setFormData({ ...formData, retailPrice: e.target.value })}
                    placeholder="e.g. 6900"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-gray-500">Selling price to customer</span>
                </div>
              </div>

              {/* Stock and Low Stock Alert */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Current Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="e.g. 10"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    value={formData.lowStockAt}
                    onChange={(e) => setFormData({ ...formData, lowStockAt: e.target.value })}
                    placeholder="e.g. 2"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Supplier
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Supplier name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Description / Specification
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Dimensions, foam density, color, etc."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Custom Category Quick Modal */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏷️</span>
                <h2 className="text-base font-bold text-gray-900">Add New Category</h2>
              </div>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAddNewCategory(newCatInput)
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  placeholder="e.g. Sofa Set, Wooden Cot, Dining Table, Chairs"
                  className="w-full border-2 border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Suggestions */}
              <div>
                <div className="text-[11px] font-semibold text-gray-500 mb-1.5">
                  Popular Furniture Categories:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setNewCatInput(sug)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${newCatInput === sug
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border-gray-200'
                        }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCatInput.trim()}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Stock Inward Intake Modal */}
      {showInwardModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📥</span>
                <h2 className="text-base font-bold text-gray-900">Stock Inward / Shipment Intake</h2>
              </div>
              <button
                onClick={() => setShowInwardModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveInward} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select Product *
                </label>
                <select
                  required
                  value={inwardProductId || ''}
                  onChange={(e) => {
                    const id = parseInt(e.target.value)
                    setInwardProductId(id)
                    const p = products.find((prod) => prod.id === id)
                    if (p) {
                      setInwardCost(String(p.wholesalePrice || p.costPrice || ''))
                      setInwardSupplier(p.supplier || '')
                    }
                  }}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current Stock: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Quantity Received *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={inwardQty}
                    onChange={(e) => setInwardQty(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Purchase Cost per Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={inwardCost}
                    onChange={(e) => setInwardCost(e.target.value)}
                    placeholder="Wholesale price"
                    className="w-full border rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Supplier / Factory
                  </label>
                  <input
                    type="text"
                    value={inwardSupplier}
                    onChange={(e) => setInwardSupplier(e.target.value)}
                    placeholder="e.g. Maruthi Steel Works"
                    className="w-full border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Purchase Invoice / Challan #
                  </label>
                  <input
                    type="text"
                    value={inwardInvoiceNo}
                    onChange={(e) => setInwardInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-892"
                    className="w-full border rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-900">
                  <input
                    type="checkbox"
                    checked={inwardAddExpense}
                    onChange={(e) => setInwardAddExpense(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Automatically log total purchase cost (₹{(parseInt(inwardQty || '0') * parseFloat(inwardCost || '0')).toLocaleString('en-IN')}) into Expenses?</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowInwardModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingInward || !inwardProductId}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
                >
                  {savingInward ? 'Recording Intake...' : 'Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
