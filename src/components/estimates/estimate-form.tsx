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
import { Plus, Trash2, Save, Send, Eye, EyeOff, ChevronDown, ChevronRight, Car, Download, Wand2, ScanLine, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ESTIMATE_TEMPLATES, calcWeightTax, type TemplateType } from '@/lib/estimate-templates'

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

/** 「令和3年4月」→「R3/4」、「平成30年12月」→「H30/12」、「2021」→「2021」 */
function convertVehicleYear(raw: string): string {
  const reiwa = raw.match(/令和\s*(\d+)年\s*(\d+)?月?/)
  if (reiwa) return reiwa[2] ? `R${reiwa[1]}/${reiwa[2]}` : `R${reiwa[1]}`
  const heisei = raw.match(/平成\s*(\d+)年\s*(\d+)?月?/)
  if (heisei) return heisei[2] ? `H${heisei[1]}/${heisei[2]}` : `H${heisei[1]}`
  const showa = raw.match(/昭和\s*(\d+)年\s*(\d+)?月?/)
  if (showa) return showa[2] ? `S${showa[1]}/${showa[2]}` : `S${showa[1]}`
  // 西暦そのまま or パース不能ならそのまま返す
  return raw.trim()
}

function parseVehicleRegistration(text: string): {
  vehicleName?: string
  vehicleNumber?: string
  firstRegistration?: string
  nextInspectionDate?: string
  vehicleWeight?: string
} {
  const result: {
    vehicleName?: string
    vehicleNumber?: string
    firstRegistration?: string
    nextInspectionDate?: string
    vehicleWeight?: string
  } = {}

  // 車名（OCRで「車 名」「車名」「車　名」等の揺れに対応）
  const vehicleNameMatch = text.match(/車\s*名[\s:：　]*([^\s\n　]{2,10})/)
  if (vehicleNameMatch) result.vehicleName = vehicleNameMatch[1]

  // 車両番号（ナンバープレート: 地名 分類番号 ひらがな 連番）
  // カタカナの「ー」や全角数字にも対応
  const plateMatch = text.match(/([\u4e00-\u9fff]{1,4})\s*(\d{2,3})\s*([\u3041-\u3096\u30A0-\u30FF])\s*(\d{1,4})/)
  if (plateMatch) {
    const serialNum = plateMatch[4].padStart(4, '0')
    result.vehicleNumber = `${plateMatch[1]} ${plateMatch[2]} ${plateMatch[3]} ${serialNum}`
  }

  // 初度登録年月（「初度登録」だけの場合や、ラベルとの距離が離れている場合にも対応）
  const reiwaFirstReg = text.match(/初度登録[\s\S]{0,20}令和\s*(\d+)\s*年\s*(\d+)\s*月/)
  const heiseiFirstReg = text.match(/初度登録[\s\S]{0,20}平成\s*(\d+)\s*年\s*(\d+)\s*月/)
  const showaFirstReg = text.match(/初度登録[\s\S]{0,20}昭和\s*(\d+)\s*年\s*(\d+)\s*月/)
  if (reiwaFirstReg) {
    result.firstRegistration = `R${reiwaFirstReg[1]}/${reiwaFirstReg[2]}`
  } else if (heiseiFirstReg) {
    result.firstRegistration = `H${heiseiFirstReg[1]}/${heiseiFirstReg[2]}`
  } else if (showaFirstReg) {
    result.firstRegistration = `S${showaFirstReg[1]}/${showaFirstReg[2]}`
  } else {
    // 「初度登録」ラベルなしでも元号+年月パターンを探す（フォールバック）
    const anyEraReg = text.match(/(令和|平成|昭和)\s*(\d+)\s*年\s*(\d+)\s*月/)
    if (anyEraReg) {
      const prefix = anyEraReg[1] === '令和' ? 'R' : anyEraReg[1] === '平成' ? 'H' : 'S'
      result.firstRegistration = `${prefix}${anyEraReg[2]}/${anyEraReg[3]}`
    }
  }

  // 有効期間の満了する日（次回車検日）
  const convertJapaneseDate = (era: string, year: string, month: string, day: string): string => {
    let baseYear = 0
    if (era === '令和') baseYear = 2018
    else if (era === '平成') baseYear = 1988
    else if (era === '昭和') baseYear = 1925
    const y = baseYear + Number(year)
    return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  // 「満了する日」「有効期間」等の揺れに対応、距離を広めに取る
  const expiryMatch = text.match(/(?:有効期間|満了)[\s\S]{0,30}(令和|平成|昭和)\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日/)
  if (expiryMatch) {
    result.nextInspectionDate = convertJapaneseDate(expiryMatch[1], expiryMatch[2], expiryMatch[3], expiryMatch[4])
  }

  // 車両重量（kg）- 「kg」なしでも数値だけ取れるよう緩和
  const weightMatch = text.match(/車両重量[\s:：　]*(\d{3,5})\s*(?:kg|ｋｇ|キログラム)?/i)
  if (weightMatch) result.vehicleWeight = weightMatch[1]

  return result
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
  const [vehicleScanLoading, setVehicleScanLoading] = useState(false)
  const vehicleScanInputRef = useRef<HTMLInputElement>(null)

  // Template auto-fill state
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null)
  const [vehicleWeightStr, setVehicleWeightStr] = useState('')
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
    // 車両情報を自動入力
    if (customer.vehicle_model || customer.vehicle_number || customer.vehicle_inspection_date) {
      setShowVehicleInfo(true)
      if (customer.vehicle_model) setVehicleName(customer.vehicle_model)
      if (customer.vehicle_number) setVehicleNumber(customer.vehicle_number)
      if (customer.vehicle_inspection_date) setNextInspectionDate(customer.vehicle_inspection_date)
    }
  }

  async function handleVehicleScan(file: File) {
    setVehicleScanLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/vehicle-scan', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        toast.error(`読み取り失敗: ${data.error ?? `HTTP ${res.status}`}`)
        return
      }

      setShowVehicleInfo(true)
      let filled = 0
      if (data.vehicle_model) { setVehicleName(data.vehicle_model); filled++ }
      if (data.vehicle_number) { setVehicleNumber(data.vehicle_number); filled++ }
      if (data.vehicle_year) { setFirstRegistration(convertVehicleYear(data.vehicle_year)); filled++ }
      if (data.vehicle_inspection_date) { setNextInspectionDate(data.vehicle_inspection_date); filled++ }
      if (data.vehicle_weight) { setVehicleWeightStr(data.vehicle_weight); filled++ }

      if (filled > 0) {
        toast.success(`車検証から${filled}件の情報を自動入力しました`)
      } else {
        toast.warning('車検証を読み取れませんでした。画像を確認して手動で入力してください。')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'スキャンに失敗しました')
    } finally {
      setVehicleScanLoading(false)
      if (vehicleScanInputRef.current) vehicleScanInputRef.current.value = ''
    }
  }

  function handleApplyTemplate() {
    if (!selectedTemplate) {
      toast.error('テンプレートを選択してください')
      return
    }
    const tmpl = ESTIMATE_TEMPLATES.find((t) => t.type === selectedTemplate)
    if (!tmpl) return

    const weightKg = vehicleWeightStr ? Number(vehicleWeightStr) : 0

    if (tmpl.needsWeight && (!vehicleWeightStr || weightKg <= 0)) {
      toast.error('車両重量を入力してください（重量税の計算に必要です）')
      return
    }

    if (tmpl.lines.length === 0) {
      toast.info('テンプレートを選択しました。明細を手動で追加してください。')
      return
    }

    const newItems = tmpl.lines.map((l, i) => {
      const unitPrice = l.unit_price === null ? calcWeightTax(weightKg) : l.unit_price
      const amount = unitPrice * l.quantity
      const partsAmount = l.category === '部品' ? amount : 0
      const laborAmount = l.category === '技術' ? amount : 0
      return {
        id: `tpl-${Date.now()}-${i}`,
        description: l.description,
        category: l.category,
        quantity: l.quantity,
        unit_price: unitPrice,
        tax_rate: l.tax_rate,
        parts_amount: partsAmount,
        labor_amount: laborAmount,
        amount,
      }
    })

    setLineItems(newItems)

    // 車検系は車両情報セクションを開く
    if (tmpl.needsWeight || selectedTemplate === 'vehicle_inspection_kei') {
      setShowVehicleInfo(true)
    }

    toast.success(`「${tmpl.label}」のテンプレートを適用しました`)
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
      } else {
        await createEstimate(payload)
        toast.success('見積書を作成しました')
      }
      router.push('/estimates')
    } catch {
      toast.error('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const activeTemplate = ESTIMATE_TEMPLATES.find((t) => t.type === selectedTemplate)

  const formContent = (
    <div className="space-y-6">
      {/* Template Auto-fill */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-blue-800">何を作りますか？</h2>
          <span className="text-xs text-blue-500">テンプレートから明細を自動入力</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {ESTIMATE_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.type}
              type="button"
              onClick={() => setSelectedTemplate(tmpl.type === selectedTemplate ? null : tmpl.type)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                selectedTemplate === tmpl.type
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
              )}
            >
              {tmpl.label}
            </button>
          ))}
        </div>
        {activeTemplate && activeTemplate.needsWeight && (
          <div className="mb-4 max-w-xs">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              車両重量 (kg) <span className="text-red-500">*</span>
              <span className="ml-1 text-gray-400 font-normal">— 重量税の自動計算に使用</span>
            </label>
            <div className="relative">
              <Input
                type="number"
                min={0}
                value={vehicleWeightStr}
                onChange={(e) => setVehicleWeightStr(e.target.value)}
                placeholder="例: 1500"
                className="h-9 text-sm pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">kg</span>
            </div>
            {vehicleWeightStr && Number(vehicleWeightStr) > 0 && (
              <p className="mt-1 text-xs text-blue-600">
                重量税: ¥{calcWeightTax(Number(vehicleWeightStr)).toLocaleString('ja-JP')}
              </p>
            )}
          </div>
        )}
        {selectedTemplate && selectedTemplate !== 'other' && (
          <button
            type="button"
            onClick={handleApplyTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Wand2 className="w-3.5 h-3.5" />
            この情報で見積もりを作成
          </button>
        )}
      </div>

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setShowVehicleInfo(!showVehicleInfo)}
            className="flex items-center gap-2 text-left"
          >
            <Car className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-700">車両情報</h2>
            {showVehicleInfo ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>
          <div>
            <input
              ref={vehicleScanInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleVehicleScan(file)
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
              disabled={vehicleScanLoading}
              onClick={() => vehicleScanInputRef.current?.click()}
            >
              {vehicleScanLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ScanLine className="w-3.5 h-3.5" />
              )}
              車検証をスキャン
            </Button>
          </div>
        </div>
        {showVehicleInfo && (
          <div className="px-5 pb-5 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <table className="w-full text-sm" style={{ minWidth: '720px' }}>
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left pb-2 font-medium text-gray-600" style={{ minWidth: '200px' }}>作業内容・使用部品名</th>
                <th className="text-center pb-2 font-medium text-gray-600" style={{ minWidth: '80px' }}>区分</th>
                <th className="text-right pb-2 font-medium text-gray-600" style={{ minWidth: '70px' }}>数量</th>
                <th className="text-right pb-2 font-medium text-gray-600" style={{ minWidth: '110px' }}>単価</th>
                <th className="text-right pb-2 font-medium text-gray-600" style={{ minWidth: '100px' }}>部品金額</th>
                <th className="text-right pb-2 font-medium text-gray-600" style={{ minWidth: '100px' }}>技術料</th>
                <th className="text-right pb-2 font-medium text-gray-600" style={{ minWidth: '60px' }}>税率</th>
                <th style={{ width: '36px' }} />
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
                  <td className="py-2 pr-2 text-right tabular-nums text-gray-700 text-xs whitespace-nowrap">
                    {line.parts_amount ? formatCurrency(line.parts_amount) : '-'}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-gray-700 text-xs whitespace-nowrap">
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
        <Button
          variant="outline"
          disabled={saving}
          className="gap-1.5 h-12 sm:h-auto border-green-300 text-green-700 hover:bg-green-50"
          onClick={async () => {
            if (!customerName.trim()) { toast.error('顧客名を入力してください'); return }
            setSaving(true)
            try {
              let savedId = initialData?.id
              if (mode === 'edit' && initialData) {
                const payload = {
                  customer_name: customerName, customer_address: customerAddress, customer_code: customerCode || undefined,
                  issue_date: issueDate, valid_until: validUntil, tax_mode: taxMode, subtotal, tax_amount: taxAmount, total,
                  discount: discount || undefined, status: 'draft' as const, notes,
                  vehicle_name: vehicleName || undefined, vehicle_number: vehicleNumber || undefined,
                  mileage: mileageStr ? Number(mileageStr) : undefined,
                  first_registration: firstRegistration || undefined, next_inspection_date: nextInspectionDate || undefined,
                  delivery_date: deliveryDate || undefined, delivery_category: deliveryCategory || undefined, staff_name: staffName || undefined,
                  line_items: lineItems.map((l, i) => ({
                    id: l.id, estimate_id: initialData.id, description: l.description, category: l.category || undefined,
                    quantity: typeof l.quantity === 'number' ? l.quantity : 0, unit_price: typeof l.unit_price === 'number' ? l.unit_price : 0,
                    tax_rate: l.tax_rate, parts_amount: l.parts_amount || undefined, labor_amount: l.labor_amount || undefined,
                    amount: l.amount, line_order: i + 1,
                  })) as EstimateLineItem[],
                }
                await updateEstimate(initialData.id, payload)
              } else {
                const created = await createEstimate({
                  customer_name: customerName, customer_address: customerAddress, customer_code: customerCode || undefined,
                  issue_date: issueDate, valid_until: validUntil, tax_mode: taxMode, subtotal, tax_amount: taxAmount, total,
                  discount: discount || undefined, status: 'draft' as const, notes,
                  vehicle_name: vehicleName || undefined, vehicle_number: vehicleNumber || undefined,
                  mileage: mileageStr ? Number(mileageStr) : undefined,
                  first_registration: firstRegistration || undefined, next_inspection_date: nextInspectionDate || undefined,
                  delivery_date: deliveryDate || undefined, delivery_category: deliveryCategory || undefined, staff_name: staffName || undefined,
                  line_items: lineItems.map((l, i) => ({
                    id: l.id, estimate_id: '', description: l.description, category: l.category || undefined,
                    quantity: typeof l.quantity === 'number' ? l.quantity : 0, unit_price: typeof l.unit_price === 'number' ? l.unit_price : 0,
                    tax_rate: l.tax_rate, parts_amount: l.parts_amount || undefined, labor_amount: l.labor_amount || undefined,
                    amount: l.amount, line_order: i + 1,
                  })) as EstimateLineItem[],
                })
                savedId = created.id
              }
              // Download PDF
              const res = await fetch(`/api/pdf/estimate?id=${savedId}`)
              if (!res.ok) throw new Error('PDF生成に失敗しました')
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `見積書_${customerName}_${issueDate}.pdf`
              a.click()
              URL.revokeObjectURL(url)
              toast.success('保存してPDFをダウンロードしました')
              router.push('/estimates')
            } catch {
              toast.error('保存またはPDF生成に失敗しました')
            } finally {
              setSaving(false)
            }
          }}
        >
          <Download className="w-4 h-4" />
          保存してPDF
        </Button>
        <Button onClick={() => handleSave('sent')} disabled={saving} className="gap-1.5 h-12 sm:h-auto">
          <Send className="w-4 h-4" />
          {mode === 'edit' ? '送付済みにする' : '作成して送付'}
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
