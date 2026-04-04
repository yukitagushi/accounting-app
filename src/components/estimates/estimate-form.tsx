'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/shared/currency-input'
import { InvoicePreview } from '@/components/invoices/invoice-preview'
import { createEstimate, updateEstimate } from '@/lib/mock-data'
import { CustomerSearch } from '@/components/shared/customer-search'
import type { Estimate, EstimateLineItem, TaxMode, Customer } from '@/lib/types'
import { Plus, Trash2, Save, Send, Eye, EyeOff, ChevronDown, ChevronRight, Car } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface EstimateFormProps {
  initialData?: Estimate
  mode: 'new' | 'edit'
}

interface LineItemDraft {
  id: string
  description: string
  category: string
  quantity: number | ''
  unit_price: number | ''
  tax_rate: number
  parts_amount: number
  labor_amount: number
  amount: number
}

function formatCurrency(val: number): string {
  return '\u00a5' + val.toLocaleString('ja-JP')
}

function calcLineAmount(qty: number | '', price: number | ''): number {
  if (qty === '' || price === '') return 0
  return (qty as number) * (price as number)
}

export function EstimateForm({ initialData, mode }: EstimateFormProps) {
  const router = useRouter()
  const today = new Date().toISOString().slice(0, 10)
  const oneMonth = new Date()
  oneMonth.setMonth(oneMonth.getMonth() + 1)
  const oneMonthStr = oneMonth.toISOString().slice(0, 10)

  const [customerName, setCustomerName] = useState(initialData?.customer_name ?? '')
  const [customerAddress, setCustomerAddress] = useState(initialData?.customer_address ?? '')
  const [customerCode, setCustomerCode] = useState(initialData?.customer_code ?? '')
  const [issueDate, setIssueDate] = useState(initialData?.issue_date ?? today)
  const [validUntil, setValidUntil] = useState(initialData?.valid_until ?? oneMonthStr)
  const [taxMode, setTaxMode] = useState<TaxMode>(initialData?.tax_mode ?? 'exclusive')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [discount, setDiscount] = useState<number>(initialData?.discount ?? 0)
  const [saving, setSaving] = useState(false)
  const [showMobilePreview, setShowMobilePreview] = useState(false)
  const [showVehicleInfo, setShowVehicleInfo] = useState(!!initialData?.vehicle_name)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(0.5)

  // Vehicle info
  const [vehicleName, setVehicleName] = useState(initialData?.vehicle_name ?? '')
  const [vehicleNumber, setVehicleNumber] = useState(initialData?.vehicle_number ?? '')
  const [mileageStr, setMileageStr] = useState(initialData?.mileage?.toString() ?? '')
  const [firstRegistration, setFirstRegistration] = useState(initialData?.first_registration ?? '')
  const [nextInspectionDate, setNextInspectionDate] = useState(initialData?.next_inspection_date ?? '')
  const [deliveryDate, setDeliveryDate] = useState(initialData?.delivery_date ?? '')
  const [deliveryCategory, setDeliveryCategory] = useState(initialData?.delivery_category ?? '')
  const [staffName, setStaffName] = useState(initialData?.staff_name ?? '')

  const [lineItems, setLineItems] = useState<LineItemDraft[]>(() => {
    if (initialData?.line_items && initialData.line_items.length > 0) {
      return initialData.line_items.map((l) => ({
        id: l.id,
        description: l.description,
        category: l.category ?? '',
        quantity: l.quantity,
        unit_price: l.unit_price,
        tax_rate: l.tax_rate,
        parts_amount: l.parts_amount ?? 0,
        labor_amount: l.labor_amount ?? 0,
        amount: l.amount,
      }))
    }
    return [
      { id: 'new-1', description: '', category: '部品', quantity: 1, unit_price: '', tax_rate: 0.1, parts_amount: 0, labor_amount: 0, amount: 0 },
    ]
  })

  // Calculate preview scale based on container width
  useEffect(() => {
    function updateScale() {
      if (previewContainerRef.current) {
        const containerWidth = previewContainerRef.current.offsetWidth
        const scale = Math.min((containerWidth - 16) / 595, 0.65)
        setPreviewScale(scale)
      }
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  function handleCustomerSelect(customer: Customer) {
    setCustomerName(customer.name)
    setCustomerAddress(customer.address)
    setCustomerCode(customer.customer_code)
  }

  function addLine() {
    setLineItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        description: '',
        category: '部品',
        quantity: 1,
        unit_price: '',
        tax_rate: 0.1,
        parts_amount: 0,
        labor_amount: 0,
        amount: 0,
      },
    ])
  }

  function removeLine(id: string) {
    setLineItems((prev) => prev.filter((l) => l.id !== id))
  }

  function updateLine(id: string, field: keyof LineItemDraft, value: string | number | '') {
    setLineItems((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l
        const updated = { ...l, [field]: value }
        updated.amount = calcLineAmount(
          field === 'quantity' ? (value as number | '') : updated.quantity,
          field === 'unit_price' ? (value as number | '') : updated.unit_price
        )
        // Auto-compute parts/labor based on category
        if (field === 'category' || field === 'quantity' || field === 'unit_price') {
          if (updated.category === '部品') {
            updated.parts_amount = updated.amount
            updated.labor_amount = 0
          } else if (updated.category === '技術') {
            updated.parts_amount = 0
            updated.labor_amount = updated.amount
          } else {
            updated.parts_amount = 0
            updated.labor_amount = 0
          }
        }
        return updated
      })
    )
  }

  // Totals
  const subtotal = lineItems.reduce((sum, l) => sum + l.amount, 0)
  const partsSubtotal = lineItems.reduce((sum, l) => sum + (l.parts_amount || 0), 0)
  const laborSubtotal = lineItems.reduce((sum, l) => sum + (l.labor_amount || 0), 0)
  const discountedSubtotal = subtotal - discount

  // Calculate tax respecting per-line tax rates and tax mode
  const taxAmount = (() => {
    if (subtotal === 0) return 0
    const discountRatio = subtotal > 0 ? discountedSubtotal / subtotal : 1
    if (taxMode === 'inclusive') {
      // Tax-inclusive: tax is already included in amounts
      return lineItems.reduce((sum, l) => {
        const discountedAmount = l.amount * discountRatio
        return sum + Math.floor(discountedAmount * l.tax_rate / (1 + l.tax_rate))
      }, 0)
    }
    // Tax-exclusive: tax is added on top
    return lineItems.reduce((sum, l) => {
      const discountedAmount = l.amount * discountRatio
      return sum + Math.floor(discountedAmount * l.tax_rate)
    }, 0)
  })()

  const total = taxMode === 'inclusive' ? discountedSubtotal : discountedSubtotal + taxAmount

  const previewLineItems = useMemo(
    () =>
      lineItems.map((l) => ({
        description: l.description,
        category: l.category,
        quantity: typeof l.quantity === 'number' ? l.quantity : 0,
        unitPrice: typeof l.unit_price === 'number' ? l.unit_price : 0,
        taxRate: l.tax_rate,
        partsAmount: l.parts_amount,
        laborAmount: l.labor_amount,
      })),
    [lineItems]
  )

  const estimateNumber = useMemo(() => {
    if (initialData?.estimate_number) return initialData.estimate_number
    const now = new Date()
    return `EST-${now.getFullYear()}-XXX`
  }, [initialData])

  async function handleSave(status: 'draft' | 'sent') {
    if (!customerName.trim()) {
      toast.error('顧客名を入力してください')
      return
    }
    if (discount > subtotal) {
      toast.error('値引き額が小計を超えています')
      return
    }
    setSaving(true)
    try {
      const payload = {
        customer_name: customerName,
        customer_address: customerAddress,
        customer_code: customerCode || undefined,
        issue_date: issueDate,
        valid_until: validUntil,
        tax_mode: taxMode,
        subtotal,
        tax_amount: taxAmount,
        total,
        discount: discount || undefined,
        status,
        notes,
        vehicle_name: vehicleName || undefined,
        vehicle_number: vehicleNumber || undefined,
        mileage: mileageStr ? Number(mileageStr) : undefined,
        first_registration: firstRegistration || undefined,
        next_inspection_date: nextInspectionDate || undefined,
        delivery_date: deliveryDate || undefined,
        delivery_category: deliveryCategory || undefined,
        staff_name: staffName || undefined,
        line_items: lineItems.map((l, i) => ({
          id: l.id,
          estimate_id: initialData?.id ?? '',
          description: l.description,
          category: l.category || undefined,
          quantity: typeof l.quantity === 'number' ? l.quantity : 0,
          unit_price: typeof l.unit_price === 'number' ? l.unit_price : 0,
          tax_rate: l.tax_rate,
          parts_amount: l.parts_amount || undefined,
          labor_amount: l.labor_amount || undefined,
          amount: l.amount,
          line_order: i + 1,
        })) as EstimateLineItem[],
      }

      if (mode === 'edit' && initialData) {
        await updateEstimate(initialData.id, payload)
        toast.success('見積書を更新しました')
        router.push(`/estimates/${initialData.id}`)
        return
      } else {
        const created = await createEstimate(payload)
        toast.success('見積書を作成しました')
        router.push(`/estimates/${created.id}`)
        return
      }
    } catch {
      toast.error('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const formContent = (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">基本情報</h2>
        <div className="mb-4">
          <Label className="mb-1.5 block">顧客検索</Label>
          <CustomerSearch
            onSelect={handleCustomerSelect}
            currentCustomerName={customerName}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="customerName">顧客名 <span className="text-red-500">*</span></Label>
            <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="例: 盛岡いすゞモーター株式会社" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customerAddress">顧客住所</Label>
            <Input id="customerAddress" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="例: 東京都渋谷区1-1-1" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customerCode">顧客コード</Label>
            <Input id="customerCode" value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} placeholder="例: C-001" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="issueDate">発行日</Label>
            <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="validUntil">有効期限</Label>
            <Input id="validUntil" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>

        {/* Tax mode toggle */}
        <div className="mt-4">
          <Label className="mb-2 block">税区分</Label>
          <div className="flex gap-2">
            {(['exclusive', 'inclusive'] as TaxMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTaxMode(m)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                  taxMode === m
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                )}
              >
                {m === 'exclusive' ? '税抜' : '税込'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicle Info (collapsible) */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          type="button"
          onClick={() => setShowVehicleInfo(!showVehicleInfo)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">車両情報</h2>
          </div>
          {showVehicleInfo ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>
        {showVehicleInfo && (
          <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>車名</Label>
              <Input value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} placeholder="例: アルファード" />
            </div>
            <div className="space-y-1.5">
              <Label>車両番号</Label>
              <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="例: 練馬 300 あ 1234" />
            </div>
            <div className="space-y-1.5">
              <Label>走行距離 (km)</Label>
              <Input type="number" value={mileageStr} onChange={(e) => setMileageStr(e.target.value)} placeholder="例: 45000" />
            </div>
            <div className="space-y-1.5">
              <Label>初年度</Label>
              <Input value={firstRegistration} onChange={(e) => setFirstRegistration(e.target.value)} placeholder="例: R3/4" />
            </div>
            <div className="space-y-1.5">
              <Label>入庫日</Label>
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>次回車検日</Label>
              <Input type="date" value={nextInspectionDate} onChange={(e) => setNextInspectionDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>納品区分</Label>
              <Input value={deliveryCategory} onChange={(e) => setDeliveryCategory(e.target.value)} placeholder="例: 車検" />
            </div>
            <div className="space-y-1.5">
              <Label>担当者</Label>
              <Input value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="例: 竹花 太郎" />
            </div>
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">明細</h2>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left pb-2 font-medium text-gray-600 w-[30%]">作業内容・使用部品名</th>
                <th className="text-center pb-2 font-medium text-gray-600 w-[10%]">区分</th>
                <th className="text-right pb-2 font-medium text-gray-600 w-[8%]">数量</th>
                <th className="text-right pb-2 font-medium text-gray-600 w-[14%]">単価</th>
                <th className="text-right pb-2 font-medium text-gray-600 w-[14%]">部品金額</th>
                <th className="text-right pb-2 font-medium text-gray-600 w-[14%]">技術料</th>
                <th className="text-right pb-2 font-medium text-gray-600 w-[6%]">税率</th>
                <th className="w-[4%]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineItems.map((line) => (
                <tr key={line.id}>
                  <td className="py-2 pr-2">
                    <Input value={line.description} onChange={(e) => updateLine(line.id, 'description', e.target.value)} placeholder="品名・作業内容" className="h-8 text-sm" />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={line.category}
                      onChange={(e) => updateLine(line.id, 'category', e.target.value)}
                      className="w-full h-8 rounded-md border border-input bg-background px-1 text-sm text-center"
                    >
                      <option value="部品">部品</option>
                      <option value="技術">技術</option>
                      <option value="その他">その他</option>
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <Input
                      type="number" min={0} value={line.quantity}
                      onChange={(e) => updateLine(line.id, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                      className="h-8 text-sm text-right tabular-nums"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <CurrencyInput value={line.unit_price} onChange={(v) => updateLine(line.id, 'unit_price', v)} className="h-8 text-sm" />
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-gray-700 text-xs">
                    {line.parts_amount ? formatCurrency(line.parts_amount) : '-'}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-gray-700 text-xs">
                    {line.labor_amount ? formatCurrency(line.labor_amount) : '-'}
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={line.tax_rate}
                      onChange={(e) => updateLine(line.id, 'tax_rate', Number(e.target.value))}
                      className="w-full h-8 rounded-md border border-input bg-background px-1 text-sm text-right"
                    >
                      <option value={0}>0%</option>
                      <option value={0.08}>8%</option>
                      <option value={0.1}>10%</option>
                    </select>
                  </td>
                  <td className="py-2">
                    <button type="button" onClick={() => removeLine(line.id)} disabled={lineItems.length === 1} className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {lineItems.map((line, idx) => (
            <div key={line.id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">明細 {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  disabled={lineItems.length === 1}
                  className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">作業内容・使用部品名</Label>
                <Input
                  value={line.description}
                  onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                  placeholder="品名・作業内容"
                  className="h-11 text-base"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">区分</Label>
                  <select
                    value={line.category}
                    onChange={(e) => updateLine(line.id, 'category', e.target.value)}
                    className="w-full h-11 rounded-lg border border-input bg-background px-3 text-base"
                  >
                    <option value="部品">部品</option>
                    <option value="技術">技術</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">税率</Label>
                  <select
                    value={line.tax_rate}
                    onChange={(e) => updateLine(line.id, 'tax_rate', Number(e.target.value))}
                    className="w-full h-11 rounded-lg border border-input bg-background px-3 text-base"
                  >
                    <option value={0}>0%</option>
                    <option value={0.08}>8%</option>
                    <option value={0.1}>10%</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">数量</Label>
                  <Input
                    type="number"
                    min={0}
                    value={line.quantity}
                    onChange={(e) => updateLine(line.id, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-11 text-base text-right tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">単価</Label>
                  <CurrencyInput
                    value={line.unit_price}
                    onChange={(v) => updateLine(line.id, 'unit_price', v)}
                    className="h-11 text-base"
                  />
                </div>
              </div>
              {line.amount > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">金額</span>
                  <span className="text-base font-bold tabular-nums text-gray-900">
                    {formatCurrency(line.amount)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        <button type="button" onClick={addLine} className="mt-3 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
          <Plus className="w-4 h-4" />
          明細を追加
        </button>

        {/* Totals */}
        <div className="mt-5 border-t border-gray-200 pt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">部品合計</span>
            <span className="tabular-nums font-medium">{formatCurrency(partsSubtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">技術料合計</span>
            <span className="tabular-nums font-medium">{formatCurrency(laborSubtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">小計</span>
            <span className="tabular-nums font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">値引き</span>
            <div className="w-32 sm:w-36">
              <CurrencyInput value={discount || ''} onChange={(v) => setDiscount(typeof v === 'number' ? v : 0)} className="h-9 text-sm text-right" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">課税計</span>
            <span className="tabular-nums font-medium">{formatCurrency(discountedSubtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">消費税</span>
            <span className="tabular-nums font-medium">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
            <span className="font-bold text-base text-gray-900">総合計</span>
            <span className="tabular-nums font-bold text-xl text-gray-900">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">備考</h2>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="備考・特記事項を入力" rows={3} className="resize-none" />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => router.push('/estimates')} disabled={saving} className="h-12 sm:h-auto">
          キャンセル
        </Button>
        <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="gap-1.5 h-12 sm:h-auto">
          <Save className="w-4 h-4" />
          下書き保存
        </Button>
        <Button onClick={() => handleSave('sent')} disabled={saving} className="gap-1.5 h-12 sm:h-auto">
          <Send className="w-4 h-4" />
          送付済みにする
        </Button>
      </div>
    </div>
  )

  const previewPanel = (
    <div
      ref={previewContainerRef}
      className="bg-gray-100 rounded-xl border border-gray-200 p-2 overflow-hidden"
    >
      <div className="flex items-center justify-between px-2 py-1.5 mb-2">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">プレビュー</h3>
      </div>
      <div
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        style={{ height: `${842 * previewScale + 16}px` }}
      >
        <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left', width: 595 }}>
          <InvoicePreview
            documentType="estimate"
            customerName={customerName}
            customerAddress={customerAddress}
            customerCode={customerCode}
            invoiceNumber={estimateNumber}
            issueDate={issueDate}
            dueDate=""
            validUntil={validUntil}
            lineItems={previewLineItems}
            taxMode={taxMode}
            discount={discount}
            notes={notes}
            vehicleName={vehicleName}
            vehicleNumber={vehicleNumber}
            mileage={mileageStr ? Number(mileageStr) : undefined}
            firstRegistration={firstRegistration}
            nextInspectionDate={nextInspectionDate}
            deliveryDate={deliveryDate}
            deliveryCategory={deliveryCategory}
            staffName={staffName}
          />
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile preview toggle */}
      <div className="lg:hidden mb-4">
        <Button variant="outline" size="sm" onClick={() => setShowMobilePreview(!showMobilePreview)} className="gap-1.5 h-12">
          {showMobilePreview ? (
            <><EyeOff className="w-4 h-4" />フォームに戻る</>
          ) : (
            <><Eye className="w-4 h-4" />プレビュー</>
          )}
        </Button>
      </div>

      {/* Desktop: side-by-side layout */}
      <div className="hidden lg:grid lg:grid-cols-[60fr_40fr] lg:gap-6">
        <div>{formContent}</div>
        <div className="sticky top-4 self-start">{previewPanel}</div>
      </div>

      {/* Mobile: toggle between form and preview */}
      <div className="lg:hidden">
        {showMobilePreview ? previewPanel : formContent}
      </div>
    </>
  )
}
