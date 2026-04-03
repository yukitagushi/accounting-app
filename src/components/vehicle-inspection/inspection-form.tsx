'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CurrencyInput } from '@/components/shared/currency-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { VEHICLE_INSPECTION_ITEMS } from '@/lib/constants'
import type { VehicleInspection, VehicleInspectionStatus } from '@/lib/types'
import { CheckCircle, Circle, Clock, Car, ChevronRight } from 'lucide-react'

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

  function handleSave() {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      router.push('/vehicle-inspection')
    }, 600)
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
