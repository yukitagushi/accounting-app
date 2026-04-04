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
import { createJournalEntry, createVehicleInspection, updateVehicleInspection } from '@/lib/mock-data'
import type { VehicleInspection, VehicleInspectionStatus } from '@/lib/types'
import { CheckCircle, Circle, Clock, Car, ChevronRight, BookOpen } from 'lucide-react'
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
  const [vehicleNumber, setVehicleNumber] = useState(initialData?.vehicle_number ?? '')
  const [inspectionDate, setInspectionDate] = useState(initialData?.inspection_date ?? '')
  const [status, setStatus] = useState<VehicleInspectionStatus>(initialData?.status ?? 'pending')
  const [saving, setSaving] = useState(false)

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

  function handleCustomerSelect(customer: Customer) {
    setCustomerName(customer.name)
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
      // Account code mapping for each item
      const depositAccountMap: Record<string, { code: string; name: string }> = {
        jibaiseki: { code: '2220', name: '自賠責保険預り金' },
        weight_tax: { code: '2230', name: '重量税預り金' },
        stamp: { code: '2240', name: '印紙代預り金' },
        maintenance: { code: '2210', name: '車検預り金' },
        parts: { code: '2210', name: '車検預り金' },
        substitute_car: { code: '2210', name: '車検預り金' },
        other: { code: '2210', name: '車検預り金' },
      }

      const expenseAccountMap: Record<string, { code: string; name: string }> = {
        jibaiseki: { code: '6700', name: '保険料' },
        weight_tax: { code: '6800', name: '租税公課' },
        stamp: { code: '6800', name: '租税公課' },
        maintenance: { code: '4200', name: '車検売上' },
        parts: { code: '5100', name: '部品仕入' },
        substitute_car: { code: '7000', name: '雑費' },
        other: { code: '7000', name: '雑費' },
      }

      const lines: Array<{
        account_id: string
        debit_amount: number
        credit_amount: number
        description: string
        line_order: number
      }> = []

      let lineOrder = 1

      // For each inspection item, create journal lines
      for (const item of VEHICLE_INSPECTION_ITEMS) {
        const deposit = numVal(amounts[`deposit_${item.key}` as keyof AmountFields])
        const actual = numVal(amounts[`actual_${item.key}` as keyof AmountFields])

        if (deposit === 0 && actual === 0) continue

        const depositAcct = depositAccountMap[item.key]
        const expenseAcct = expenseAccountMap[item.key]

        // Debit: 預り金 (clear the liability) / or expense account
        if (actual > 0) {
          // For pass-through costs (自賠責, 重量税, 印紙代): debit the deposit account
          if (['jibaiseki', 'weight_tax', 'stamp'].includes(item.key)) {
            lines.push({
              account_id: depositAcct.code,
              debit_amount: actual,
              credit_amount: 0,
              description: `${item.label}（実費）`,
              line_order: lineOrder++,
            })
          } else {
            // For service items (maintenance, parts): debit expense
            lines.push({
              account_id: expenseAcct.code,
              debit_amount: actual,
              credit_amount: 0,
              description: `${item.label}（実費）`,
              line_order: lineOrder++,
            })
          }
        }

        // Credit: 現金/普通預金 for actual payment
        if (actual > 0) {
          lines.push({
            account_id: '1000',
            debit_amount: 0,
            credit_amount: actual,
            description: `${item.label}（支払）`,
            line_order: lineOrder++,
          })
        }
      }

      // Also create deposit receipt entry
      // Debit: 現金, Credit: 各預り金
      if (totalDeposit > 0) {
        // Group deposits by account
        const depositGroups: Record<string, { name: string; amount: number }> = {}
        for (const item of VEHICLE_INSPECTION_ITEMS) {
          const deposit = numVal(amounts[`deposit_${item.key}` as keyof AmountFields])
          if (deposit === 0) continue
          const acct = depositAccountMap[item.key]
          if (!depositGroups[acct.code]) {
            depositGroups[acct.code] = { name: acct.name, amount: 0 }
          }
          depositGroups[acct.code].amount += deposit
        }

        lines.unshift({
          account_id: '1000',
          debit_amount: totalDeposit,
          credit_amount: 0,
          description: '車検預り金受領',
          line_order: 0,
        })

        let depositLineOrder = 0.5
        for (const [code, { name, amount }] of Object.entries(depositGroups)) {
          lines.push({
            account_id: code,
            debit_amount: 0,
            credit_amount: amount,
            description: `${name}受領`,
            line_order: depositLineOrder++,
          })
        }
      }

      // Handle difference (settlement)
      if (totalDiff !== 0) {
        if (totalDiff > 0) {
          // Deposit > Actual: refund to customer
          lines.push({
            account_id: '2210',
            debit_amount: totalDiff,
            credit_amount: 0,
            description: '車検預り金精算（返金）',
            line_order: lineOrder++,
          })
          lines.push({
            account_id: '1000',
            debit_amount: 0,
            credit_amount: totalDiff,
            description: '車検預り金精算（返金）',
            line_order: lineOrder++,
          })
        } else {
          // Actual > Deposit: additional charge to customer
          lines.push({
            account_id: '1000',
            debit_amount: Math.abs(totalDiff),
            credit_amount: 0,
            description: '車検追加請求',
            line_order: lineOrder++,
          })
          lines.push({
            account_id: '2210',
            debit_amount: 0,
            credit_amount: Math.abs(totalDiff),
            description: '車検追加請求',
            line_order: lineOrder++,
          })
        }
      }

      // Re-number line orders
      lines.sort((a, b) => a.line_order - b.line_order)
      lines.forEach((l, i) => { l.line_order = i + 1 })

      const entry = await createJournalEntry({
        entry_date: inspectionDate || new Date().toISOString().slice(0, 10),
        description: `車検仕訳 ${customerName} ${vehicleNumber}`,
        entry_type: 'vehicle_inspection',
        status: 'draft',
        lines: lines.map((l, i) => ({
          id: `vi-je-${Date.now()}-${i}`,
          journal_entry_id: '',
          account_id: l.account_id,
          debit_amount: l.debit_amount,
          credit_amount: l.credit_amount,
          description: l.description,
          line_order: l.line_order,
        })),
      })

      // Link journal entry to inspection
      if (initialData) {
        await updateVehicleInspection(initialData.id, { journal_entry_id: entry.id })
      }

      toast.success('仕訳を自動作成しました')
      router.push(`/journal/${entry.id}`)
    } catch {
      toast.error('仕訳の作成に失敗しました')
    } finally {
      setGeneratingJournal(false)
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
