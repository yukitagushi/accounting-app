'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CurrencyInput } from '@/components/shared/currency-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { VEHICLE_INSPECTION_ITEMS } from '@/lib/constants'
import { createJournalEntry, createVehicleInspection, updateVehicleInspection, createInspectionJournalEntry, createInvoice, getAccounts, getInspectionJournalEntries } from '@/lib/supabase/database'
import { INSPECTION_ITEM_CATEGORIES } from '@/lib/constants'
import type { VehicleInspection, VehicleInspectionStatus, InspectionJournalEntry, JournalEntryLine, InvoiceLineItem } from '@/lib/types'
import { CheckCircle, Circle, Clock, Car, ChevronRight, BookOpen, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { CustomerSearch } from '@/components/shared/customer-search'
import type { Customer } from '@/lib/types'

type ItemKey = typeof VEHICLE_INSPECTION_ITEMS[number]['key']

type AmountFields = {
  [K in `deposit_${ItemKey}` | `actual_${ItemKey}`]: number | ''
}

interface InspectionFormProps {
  initialData?: VehicleInspection
  mode: 'new' | 'edit'
}

const STATUS_STEPS: { key: VehicleInspectionStatus; label: string; icon: typeof Circle }[] = [
  { key: 'pending', label: '未処理', icon: Clock },
  { key: 'in_progress', label: '進行中', icon: Car },
  { key: 'completed', label: '完了', icon: CheckCircle },
  { key: 'settled', label: '精算済', icon: CheckCircle },
]

const STATUS_ORDER: VehicleInspectionStatus[] = ['pending', 'in_progress', 'completed', 'settled']

function formatCurrency(val: number | ''): string {
  if (val === '' || val === 0) return '¥0'
  return '¥' + Number(val).toLocaleString('ja-JP')
}

function getDiffColor(diff: number): string {
  if (diff === 0) return 'text-green-600'
  if (diff < 0) return 'text-red-600'
  return 'text-blue-600'
}

function getDiffBg(diff: number): string {
  if (diff === 0) return 'bg-green-50'
  if (diff < 0) return 'bg-red-50'
  return 'bg-blue-50'
}

export function InspectionForm({ initialData, mode }: InspectionFormProps) {
  const router = useRouter()
  const [customerName, setCustomerName] = useState(initialData?.customer_name ?? '')
  const [customerId, setCustomerId] = useState<string | undefined>(initialData?.customer_id)
  const [vehicleNumber, setVehicleNumber] = useState(initialData?.vehicle_number ?? '')
  const [inspectionDate, setInspectionDate] = useState(initialData?.inspection_date ?? '')
  const [status, setStatus] = useState<VehicleInspectionStatus>(initialData?.status ?? 'pending')
  const [saving, setSaving] = useState(false)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)
  const [linkedJournalEntries, setLinkedJournalEntries] = useState<InspectionJournalEntry[]>([])
  const [loadingLinked, setLoadingLinked] = useState(false)

  const initialAmounts: AmountFields = {} as AmountFields
  for (const item of VEHICLE_INSPECTION_ITEMS) {
    const dk = `deposit_${item.key}` as keyof AmountFields
    const ak = `actual_${item.key}` as keyof AmountFields
    initialAmounts[dk] = (initialData?.[dk as keyof VehicleInspection] as number) ?? 0
    initialAmounts[ak] = (initialData?.[ak as keyof VehicleInspection] as number) ?? 0
  }
  const [amounts, setAmounts] = useState<AmountFields>(initialAmounts)

  function setAmount(key: keyof AmountFields, val: number | '') {
    setAmounts((prev) => ({ ...prev, [key]: val }))
  }

  function numVal(v: number | ''): number {
    return v === '' ? 0 : v
  }

  const totalDeposit = VEHICLE_INSPECTION_ITEMS.reduce(
    (sum, item) => sum + numVal(amounts[`deposit_${item.key}` as keyof AmountFields]),
    0
  )
  const totalActual = VEHICLE_INSPECTION_ITEMS.reduce(
    (sum, item) => sum + numVal(amounts[`actual_${item.key}` as keyof AmountFields]),
    0
  )
  const totalDiff = totalDeposit - totalActual

  const currentStatusIdx = STATUS_ORDER.indexOf(status)

  function handleAdvanceStatus() {
    if (currentStatusIdx < STATUS_ORDER.length - 1) {
      setStatus(STATUS_ORDER[currentStatusIdx + 1])
    }
  }

  useEffect(() => {
    if (!initialData?.id) return
    setLoadingLinked(true)
    getInspectionJournalEntries(initialData.id)
      .then(setLinkedJournalEntries)
      .catch(() => {})
      .finally(() => setLoadingLinked(false))
  }, [initialData?.id])

  function handleCustomerSelect(customer: Customer) {
    setCustomerName(customer.name)
    setCustomerId(customer.id)
    if (customer.vehicle_number) setVehicleNumber(customer.vehicle_number)
    if (customer.vehicle_inspection_date) {
      // YYYY-MM-DD形式に変換して設定
      const d = customer.vehicle_inspection_date
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : ''
      if (iso) setInspectionDate(iso)
    }
    toast.success(`${customer.name} を選択しました`)
  }

  async function handleSave() {
    if (!isValid) return
    setSaving(true)
    try {
      const payload: Partial<VehicleInspection> = {
        customer_name: customerName,
        customer_id: customerId,
        vehicle_number: vehicleNumber,
        inspection_date: inspectionDate,
        status,
        total_deposit: totalDeposit,
        total_actual: totalActual,
        difference: totalDiff,
      }
      // Add all amount fields
      for (const item of VEHICLE_INSPECTION_ITEMS) {
        const dk = `deposit_${item.key}` as keyof VehicleInspection
        const ak = `actual_${item.key}` as keyof VehicleInspection
        ;(payload as Record<string, unknown>)[dk] = numVal(amounts[`deposit_${item.key}` as keyof AmountFields])
        ;(payload as Record<string, unknown>)[ak] = numVal(amounts[`actual_${item.key}` as keyof AmountFields])
      }

      if (mode === 'edit' && initialData) {
        await updateVehicleInspection(initialData.id, payload)
        toast.success('車検情報を更新しました')
      } else {
        await createVehicleInspection(payload)
        toast.success('車検情報を登録しました')
      }
      router.push('/vehicle-inspection')
    } catch {
      toast.error('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const [generatingJournal, setGeneratingJournal] = useState(false)

  async function handleGenerateJournal() {
    if (!initialData) return
    setGeneratingJournal(true)
    try {
      const accounts = await getAccounts()
      const tatekaekAccount = accounts.find((a) => a.code === '1400')
      const cashAccount = accounts.find((a) => a.code === '1000')

      if (!tatekaekAccount || !cashAccount) {
        toast.error('勘定科目（立替金・現金）が見つかりません')
        return
      }

      const passthroughKeys = ['jibaiseki', 'weight_tax', 'stamp'] as const
      const lines: Array<{
        account_id: string
        debit_amount: number
        credit_amount: number
        description: string
        line_order: number
      }> = []

      let lineOrder = 1

      for (const key of passthroughKeys) {
        const actual = numVal(amounts[`actual_${key}` as keyof AmountFields])
        if (actual <= 0) continue
        const label = INSPECTION_ITEM_CATEGORIES[key].label
        // Dr 立替金 / Cr 現金
        lines.push({
          account_id: tatekaekAccount.id,
          debit_amount: actual,
          credit_amount: 0,
          description: `${label}立替`,
          line_order: lineOrder++,
        })
        lines.push({
          account_id: cashAccount.id,
          debit_amount: 0,
          credit_amount: actual,
          description: `${label}支払`,
          line_order: lineOrder++,
        })
      }

      if (lines.length === 0) {
        toast.error('立替金額がありません（自賠責・重量税・印紙代）')
        return
      }

      const entry = await createJournalEntry({
        entry_date: inspectionDate || new Date().toISOString().slice(0, 10),
        description: `車検立替 ${customerName} ${vehicleNumber}`,
        entry_type: 'vehicle_inspection',
        status: 'draft',
        lines: lines as JournalEntryLine[],
      })

      await updateVehicleInspection(initialData.id, { journal_entry_id: entry.id })
      await createInspectionJournalEntry({
        inspection_id: initialData.id,
        journal_entry_id: entry.id,
        entry_purpose: 'advance',
      })

      // Refresh linked entries
      const refreshed = await getInspectionJournalEntries(initialData.id)
      setLinkedJournalEntries(refreshed)

      toast.success('立替仕訳を作成しました')
      router.push(`/journal/${entry.id}`)
    } catch {
      toast.error('仕訳の作成に失敗しました')
    } finally {
      setGeneratingJournal(false)
    }
  }

  async function handleGenerateInvoice() {
    if (!initialData) return
    setGeneratingInvoice(true)
    try {
      const accounts = await getAccounts()
      const arAccount = accounts.find((a) => a.code === '1100') // 売掛金 (note: 1200 in spec but types show 1100 for 売掛金)
      const tatekaekAccount = accounts.find((a) => a.code === '1400')

      if (!arAccount || !tatekaekAccount) {
        toast.error('勘定科目が見つかりません')
        return
      }

      const passthroughKeys = ['jibaiseki', 'weight_tax', 'stamp'] as const
      const revenueKeys = ['maintenance', 'parts', 'substitute_car', 'other'] as const

      const lineItems: Array<{
        description: string
        category: string
        quantity: number
        unit_price: number
        tax_rate: number
        amount: number
        line_order: number
      }> = []

      let lineOrder = 1

      for (const key of passthroughKeys) {
        const actual = numVal(amounts[`actual_${key}` as keyof AmountFields])
        if (actual <= 0) continue
        const cat = INSPECTION_ITEM_CATEGORIES[key]
        lineItems.push({
          description: cat.label,
          category: key,
          quantity: 1,
          unit_price: actual,
          tax_rate: 0,
          amount: actual,
          line_order: lineOrder++,
        })
      }

      for (const key of revenueKeys) {
        const actual = numVal(amounts[`actual_${key}` as keyof AmountFields])
        if (actual <= 0) continue
        const cat = INSPECTION_ITEM_CATEGORIES[key]
        lineItems.push({
          description: cat.label,
          category: key,
          quantity: 1,
          unit_price: actual,
          tax_rate: 0.10,
          amount: actual,
          line_order: lineOrder++,
        })
      }

      if (lineItems.length === 0) {
        toast.error('請求明細がありません')
        return
      }

      const subtotal = lineItems.reduce((s, l) => s + l.amount, 0)
      const taxAmount = lineItems.reduce((s, l) => s + Math.floor(l.amount * l.tax_rate), 0)
      const total = subtotal + taxAmount

      const today = new Date()
      const issueDate = today.toISOString().slice(0, 10)
      const dueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      const invoice = await createInvoice({
        branch_id: initialData.branch_id,
        customer_name: initialData.customer_name,
        customer_code: initialData.customer?.customer_code,
        customer_address: initialData.customer?.address ?? '',
        vehicle_number: initialData.vehicle_number,
        issue_date: issueDate,
        due_date: dueDate,
        tax_mode: 'exclusive',
        subtotal,
        tax_amount: taxAmount,
        total,
        status: 'sent',
        notes: '',
        line_items: lineItems as InvoiceLineItem[],
      })

      // Update inspection with invoice_id
      await updateVehicleInspection(initialData.id, { invoice_id: invoice.id })

      // Create invoice journal entry: Dr 売掛金 / Cr 立替金 + 売上
      const invoiceJournalLines: Array<{
        account_id: string
        debit_amount: number
        credit_amount: number
        description: string
        line_order: number
      }> = []

      let jlOrder = 1
      // Dr 売掛金 for total
      invoiceJournalLines.push({
        account_id: arAccount.id,
        debit_amount: total,
        credit_amount: 0,
        description: `車検請求 ${initialData.customer_name} ${initialData.vehicle_number}`,
        line_order: jlOrder++,
      })

      // Cr 立替金 for passthrough items
      const passthroughTotal = lineItems
        .filter((l) => ['jibaiseki', 'weight_tax', 'stamp'].includes(l.category))
        .reduce((s, l) => s + l.amount, 0)

      if (passthroughTotal > 0) {
        invoiceJournalLines.push({
          account_id: tatekaekAccount.id,
          debit_amount: 0,
          credit_amount: passthroughTotal,
          description: '立替金精算',
          line_order: jlOrder++,
        })
      }

      // Cr 売上 for revenue items (grouped by account code)
      const revenueByAccount: Record<string, { accountId: string; amount: number; label: string }> = {}
      for (const l of lineItems) {
        if (['jibaiseki', 'weight_tax', 'stamp'].includes(l.category)) continue
        const cat = INSPECTION_ITEM_CATEGORIES[l.category as keyof typeof INSPECTION_ITEM_CATEGORIES]
        if (!cat) continue
        const acct = accounts.find((a) => a.code === cat.account_code)
        if (!acct) continue
        if (!revenueByAccount[acct.id]) {
          revenueByAccount[acct.id] = { accountId: acct.id, amount: 0, label: acct.name }
        }
        revenueByAccount[acct.id].amount += l.amount + Math.floor(l.amount * l.tax_rate)
      }

      for (const { accountId, amount, label } of Object.values(revenueByAccount)) {
        invoiceJournalLines.push({
          account_id: accountId,
          debit_amount: 0,
          credit_amount: amount,
          description: label,
          line_order: jlOrder++,
        })
      }

      if (invoiceJournalLines.length > 1) {
        const invoiceEntry = await createJournalEntry({
          entry_date: issueDate,
          description: `車検請求書 ${initialData.customer_name} ${initialData.vehicle_number}`,
          entry_type: 'vehicle_inspection',
          status: 'draft',
          lines: invoiceJournalLines as JournalEntryLine[],
        })

        await createInspectionJournalEntry({
          inspection_id: initialData.id,
          journal_entry_id: invoiceEntry.id,
          entry_purpose: 'invoice',
        })
      }

      // Refresh linked entries
      const refreshed = await getInspectionJournalEntries(initialData.id)
      setLinkedJournalEntries(refreshed)

      toast.success('請求書を作成しました')
      router.push(`/invoices/${invoice.id}`)
    } catch {
      toast.error('請求書の作成に失敗しました')
    } finally {
      setGeneratingInvoice(false)
    }
  }

  const errors: Record<string, string> = {}
  if (!customerName.trim()) errors.customerName = '顧客名は必須です'
  if (!vehicleNumber.trim()) errors.vehicleNumber = '車両番号は必須です'
  if (!inspectionDate) errors.inspectionDate = '車検日は必須です'

  const isValid = Object.keys(errors).length === 0

  return (
    <div className="space-y-6">
      {/* Status Workflow Indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">進行状況</p>
        <div className="flex items-center gap-0">
          {STATUS_STEPS.map((step, idx) => {
            const isActive = step.key === status
            const isDone = STATUS_ORDER.indexOf(step.key) < currentStatusIdx
            const isLast = idx === STATUS_STEPS.length - 1
            return (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div
                  className={cn(
                    'flex flex-col items-center gap-1 cursor-pointer transition-all',
                    isActive && 'scale-105'
                  )}
                  onClick={() => setStatus(step.key)}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
                      isDone && 'bg-green-500 border-green-500 text-white',
                      isActive && 'bg-blue-500 border-blue-500 text-white',
                      !isDone && !isActive && 'bg-white border-gray-300 text-gray-400'
                    )}
                  >
                    {isDone ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-xs font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs whitespace-nowrap',
                      isActive ? 'text-blue-600 font-semibold' : isDone ? 'text-green-600' : 'text-gray-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-1 mb-5 transition-colors',
                      STATUS_ORDER.indexOf(STATUS_STEPS[idx + 1].key) <= currentStatusIdx
                        ? 'bg-green-400'
                        : 'bg-gray-200'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">顧客情報</p>

        {/* Customer Search */}
        <div className="mb-4">
          <label className="block text-xs text-gray-500 mb-1.5">顧客検索（選択すると車両情報が自動入力されます）</label>
          <CustomerSearch onSelect={handleCustomerSelect} currentCustomerName={customerName} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="customerName">顧客名 <span className="text-red-500">*</span></Label>
            <Input
              id="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="田中 太郎"
              aria-invalid={!!errors.customerName}
            />
            {errors.customerName && (
              <p className="text-xs text-red-500">{errors.customerName}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vehicleNumber">車両番号 <span className="text-red-500">*</span></Label>
            <Input
              id="vehicleNumber"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="品川 300 あ 1234"
              aria-invalid={!!errors.vehicleNumber}
            />
            {errors.vehicleNumber && (
              <p className="text-xs text-red-500">{errors.vehicleNumber}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inspectionDate">車検日 <span className="text-red-500">*</span></Label>
            <Input
              id="inspectionDate"
              type="date"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
              aria-invalid={!!errors.inspectionDate}
            />
            {errors.inspectionDate && (
              <p className="text-xs text-red-500">{errors.inspectionDate}</p>
            )}
          </div>
        </div>
      </div>

      {/* Amount Comparison Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">預かり金 vs 実際金額</p>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-600 w-32">項目</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">預かり金額</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">実際金額</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600 w-32">差額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {VEHICLE_INSPECTION_ITEMS.map((item) => {
                const dk = `deposit_${item.key}` as keyof AmountFields
                const ak = `actual_${item.key}` as keyof AmountFields
                const dep = numVal(amounts[dk])
                const act = numVal(amounts[ak])
                const diff = dep - act
                return (
                  <tr key={item.key} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-gray-700">{item.label}</td>
                    <td className="py-2 px-4">
                      <CurrencyInput
                        value={amounts[dk]}
                        onChange={(v) => setAmount(dk, v)}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <CurrencyInput
                        value={amounts[ak]}
                        onChange={(v) => setAmount(ak, v)}
                        className="h-8 text-sm"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span
                        className={cn(
                          'inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums',
                          getDiffBg(diff),
                          getDiffColor(diff)
                        )}
                      >
                        {diff === 0 ? '±0' : diff > 0 ? `+${diff.toLocaleString('ja-JP')}` : diff.toLocaleString('ja-JP')}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="py-3 px-4 font-bold text-gray-900">合計</td>
                <td className="py-3 px-4 text-right font-bold tabular-nums text-gray-900">
                  {formatCurrency(totalDeposit)}
                </td>
                <td className="py-3 px-4 text-right font-bold tabular-nums text-gray-900">
                  {formatCurrency(totalActual)}
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={cn(
                      'inline-block px-2.5 py-1 rounded text-sm font-bold tabular-nums',
                      getDiffBg(totalDiff),
                      getDiffColor(totalDiff)
                    )}
                  >
                    {totalDiff === 0
                      ? '±0'
                      : totalDiff > 0
                      ? `+${totalDiff.toLocaleString('ja-JP')}`
                      : totalDiff.toLocaleString('ja-JP')}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {VEHICLE_INSPECTION_ITEMS.map((item) => {
            const dk = `deposit_${item.key}` as keyof AmountFields
            const ak = `actual_${item.key}` as keyof AmountFields
            const dep = numVal(amounts[dk])
            const act = numVal(amounts[ak])
            const diff = dep - act
            return (
              <div key={item.key} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">{item.label}</span>
                  <span
                    className={cn(
                      'inline-block px-2 py-0.5 rounded text-xs font-semibold tabular-nums',
                      getDiffBg(diff),
                      getDiffColor(diff)
                    )}
                  >
                    差額: {diff === 0 ? '±0' : diff > 0 ? `+${diff.toLocaleString('ja-JP')}` : diff.toLocaleString('ja-JP')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">預かり金額</p>
                    <CurrencyInput value={amounts[dk]} onChange={(v) => setAmount(dk, v)} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500">実際金額</p>
                    <CurrencyInput value={amounts[ak]} onChange={(v) => setAmount(ak, v)} />
                  </div>
                </div>
              </div>
            )
          })}

          {/* Mobile Total */}
          <div className={cn('p-4', getDiffBg(totalDiff))}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-gray-900">合計差額</span>
              <span className={cn('text-lg font-bold tabular-nums', getDiffColor(totalDiff))}>
                {totalDiff === 0 ? '±0' : totalDiff > 0 ? `+${totalDiff.toLocaleString('ja-JP')}` : totalDiff.toLocaleString('ja-JP')}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>預かり: {formatCurrency(totalDeposit)}</span>
              <span>実際: {formatCurrency(totalActual)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Data */}
      {initialData && (
        <div className="space-y-4">
          {/* Linked Invoice */}
          {initialData.invoice_id && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">リンク済み請求書</p>
              {initialData.invoice ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{initialData.invoice.invoice_number}</p>
                    <p className="text-xs text-gray-500">
                      ステータス: {initialData.invoice.status} / 合計: ¥{initialData.invoice.total.toLocaleString('ja-JP')}
                      {initialData.invoice.paid_amount != null && ` / 入金済: ¥${initialData.invoice.paid_amount.toLocaleString('ja-JP')}`}
                    </p>
                  </div>
                  <Link href={`/invoices/${initialData.invoice_id}`}>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      詳細
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link href={`/invoices/${initialData.invoice_id}`} className="text-sm text-blue-600 hover:underline">
                  請求書を表示
                </Link>
              )}
            </div>
          )}

          {/* Linked Journal Entries */}
          {(loadingLinked || linkedJournalEntries.length > 0) && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">リンク済み仕訳</p>
              {loadingLinked ? (
                <p className="text-sm text-gray-500">読み込み中...</p>
              ) : (
                <div className="space-y-2">
                  {linkedJournalEntries.map((ije) => {
                    const purposeLabel: Record<string, string> = {
                      advance: '立替',
                      invoice: '請求',
                      payment: '入金',
                      settlement: '精算',
                    }
                    const je = ije.journal_entry
                    return (
                      <div key={ije.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 mr-2">
                            {purposeLabel[ije.entry_purpose] ?? ije.entry_purpose}
                          </span>
                          {je && (
                            <span className="text-sm text-gray-700">
                              {je.entry_date} - {je.description}
                            </span>
                          )}
                        </div>
                        {je && (
                          <Link href={`/journal/${ije.journal_entry_id}`}>
                            <Button variant="outline" size="sm" className="gap-1.5">
                              <BookOpen className="w-3.5 h-3.5" />
                              確認
                            </Button>
                          </Link>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <div className="flex gap-2">
          {currentStatusIdx < STATUS_ORDER.length - 1 && (
            <Button
              variant="outline"
              onClick={handleAdvanceStatus}
              className="gap-1.5"
            >
              {STATUS_ORDER[currentStatusIdx + 1] === 'completed' ? '完了にする' : STATUS_ORDER[currentStatusIdx + 1] === 'settled' ? '精算する' : '次のステータスへ'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          {(status === 'completed' || status === 'settled') && !initialData?.journal_entry_id && (
            <Button
              variant="outline"
              onClick={handleGenerateJournal}
              disabled={generatingJournal || !isValid}
              className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <BookOpen className="w-4 h-4" />
              {generatingJournal ? '仕訳作成中...' : '仕訳を自動作成'}
            </Button>
          )}
          {initialData?.journal_entry_id && (
            <Link href={`/journal/${initialData.journal_entry_id}`}>
              <Button variant="outline" className="gap-1.5 border-green-200 text-green-700 hover:bg-green-50">
                <BookOpen className="w-4 h-4" />
                仕訳を確認
              </Button>
            </Link>
          )}
          {initialData && status === 'completed' && !initialData.invoice_id && (
            <Button
              variant="outline"
              onClick={handleGenerateInvoice}
              disabled={generatingInvoice || !isValid}
              className="gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <FileText className="w-4 h-4" />
              {generatingInvoice ? '作成中...' : '請求書を作成'}
            </Button>
          )}
          {initialData?.invoice_id && (
            <Link href={`/invoices/${initialData.invoice_id}`}>
              <Button variant="outline" className="gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50">
                <FileText className="w-4 h-4" />
                請求書を確認
              </Button>
            </Link>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => router.push('/vehicle-inspection')}
            className="flex-1 sm:flex-none"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || saving}
            className="flex-1 sm:flex-none"
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  )
}
