'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { AccountingTabs } from '@/components/shared/accounting-tabs'
import { Button } from '@/components/ui/button'
import { useBranchStore } from '@/hooks/use-branch'
import {
  getTransferVouchers,
  createTransferVoucher,
  searchUnsettledVouchers,
  settleVoucher,
  deleteTransferVoucher,
} from '@/lib/supabase/database'
import type { TransferVoucher, TransferVoucherLine } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  FileText,
  CreditCard,
  ClipboardCheck,
  CalendarDays,
  ChevronRight,
  List,
  X,
} from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────

/** これらのキーワードを含む明細は「立替」として扱う */
const ADVANCE_KEYWORDS = ['重量税', '自賠責', '印紙代', '印紙']

/** 重量税テーブル（2年分・乗用車。令和6年度） */
const WEIGHT_TAX_OPTIONS: { label: string; tax: number }[] = [
  { label: '選択してください', tax: 0 },
  { label: '軽自動車 (6,600円)', tax: 6600 },
  { label: '乗用車 0.5t以下 (8,200円)', tax: 8200 },
  { label: '乗用車 0.5〜1t (16,400円)', tax: 16400 },
  { label: '乗用車 1〜1.5t (24,600円)', tax: 24600 },
  { label: '乗用車 1.5〜2t (32,800円)', tax: 32800 },
  { label: '乗用車 2〜2.5t (41,000円)', tax: 41000 },
  { label: '乗用車 2.5〜3t (49,200円)', tax: 49200 },
  { label: 'エコカー 0.5t以下 (免税/0円)', tax: 0 },
  { label: 'エコカー 0.5〜1t (8,200円→半額 4,100円)', tax: 4100 },
]

/** 印紙代テーブル（令和7年4月改定後） */
const STAMP_OPTIONS: { label: string; amount: number }[] = [
  { label: '選択してください', amount: 0 },
  { label: '軽自動車 (1,400円)', amount: 1400 },
  { label: '小型乗用車 (1,700円)', amount: 1700 },
  { label: '普通乗用車 (1,800円)', amount: 1800 },
  { label: '小型二輪 (1,100円)', amount: 1100 },
]

function isAdvanceLine(description: string): boolean {
  return ADVANCE_KEYWORDS.some((kw) => description.includes(kw))
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

function currentMonthString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatCurrency(val: number): string {
  return `¥${val.toLocaleString('ja-JP')}`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function firstDayOfMonth(monthStr: string): string {
  return `${monthStr}-01`
}

function lastDayOfMonth(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number)
  const last = new Date(y, m, 0)
  return `${y}-${String(m).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
}

// ── Types ────────────────────────────────────────────────────────────────────

type InternalTab = 'monthly' | 'debit-entry' | 'payment' | 'balance-check' | 'voucher-list'

interface DebitFormLine {
  description: string
  amount: string
}

const EMPTY_LINE = (): DebitFormLine => ({ description: '', amount: '' })

const TAB_ITEMS: { key: InternalTab; label: string; icon: React.ElementType }[] = [
  { key: 'monthly', label: '月次一覧', icon: CalendarDays },
  { key: 'debit-entry', label: '借方登録', icon: FileText },
  { key: 'payment', label: '入金処理', icon: CreditCard },
  { key: 'balance-check', label: '照合確認', icon: ClipboardCheck },
  { key: 'voucher-list', label: '振替伝票一覧', icon: List },
]

// ── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'unsettled' | 'settled' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
        status === 'settled'
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      )}
    >
      {status === 'settled' ? (
        <><CheckCircle2 className="w-3 h-3" />入金済</>
      ) : (
        <><XCircle className="w-3 h-3" />未入金</>
      )}
    </span>
  )
}

function LineTypeBadge({ lineType }: { lineType?: string }) {
  if (lineType === 'advance') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
        立替
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
      売上
    </span>
  )
}

// ── Settlement Modal ─────────────────────────────────────────────────────────

function SettlementModal({
  voucher,
  onConfirm,
  onClose,
  loading,
}: {
  voucher: TransferVoucher
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  const lines = (voucher.lines ?? []).sort((a, b) => a.line_order - b.line_order)
  const advanceTotal = lines
    .filter((l) => (l.line_type ?? (isAdvanceLine(l.description) ? 'advance' : 'sales')) === 'advance')
    .reduce((s, l) => s + l.amount, 0)
  const salesTotal = lines
    .filter((l) => (l.line_type ?? (isAdvanceLine(l.description) ? 'advance' : 'sales')) === 'sales')
    .reduce((s, l) => s + l.amount, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">入金確認</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {voucher.customer_name} — {voucher.description} ({formatDate(voucher.voucher_date)})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Line details */}
        <div className="px-5 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-left font-medium py-2 px-3 rounded-l-lg">項目</th>
                <th className="text-right font-medium py-2 px-3">金額</th>
                <th className="text-center font-medium py-2 px-3">種別</th>
                <th className="text-center font-medium py-2 px-3 rounded-r-lg">収支</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map((line, i) => {
                const ltype = line.line_type ?? (isAdvanceLine(line.description) ? 'advance' : 'sales')
                return (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 text-gray-800">{line.description}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-gray-900 font-medium">
                      {formatCurrency(line.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <LineTypeBadge lineType={ltype} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {ltype === 'advance' ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-600">
                          ±0
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-green-600">売上</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 font-bold">
                <td className="py-3 px-3 text-gray-900">合計</td>
                <td className="py-3 px-3 text-right tabular-nums text-gray-900">
                  {formatCurrency(voucher.total_amount)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>

          {/* Summary */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
              <p className="text-xs text-orange-600 mb-1">立替合計（±0）</p>
              <p className="text-base font-bold tabular-nums text-orange-800">
                {formatCurrency(advanceTotal)}
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 border border-green-100">
              <p className="text-xs text-green-600 mb-1">売上合計</p>
              <p className="text-base font-bold tabular-nums text-green-800">
                {formatCurrency(salesTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            キャンセル
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? '処理中...' : '入金確認する'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Voucher Card ─────────────────────────────────────────────────────────────

function VoucherCard({
  voucher,
  onDelete,
  showLines,
}: {
  voucher: TransferVoucher
  onDelete?: () => void
  showLines?: boolean
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow relative group">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-gray-900">
              {voucher.customer_name}
            </span>
            <StatusBadge status={voucher.status} />
          </div>
          <p className="text-sm text-gray-600 truncate">{voucher.description}</p>
          <p className="text-xs text-gray-400 mt-1">{formatDate(voucher.voucher_date)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold tabular-nums text-gray-900">
            {formatCurrency(voucher.total_amount)}
          </p>
        </div>
      </div>

      {showLines && voucher.lines && voucher.lines.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <table className="w-full text-sm">
            <tbody>
              {voucher.lines
                .sort((a, b) => a.line_order - b.line_order)
                .map((line, i) => (
                  <tr key={i} className="text-gray-600">
                    <td className="py-0.5">{line.description}</td>
                    <td className="py-0.5 text-right tabular-nums">
                      {formatCurrency(line.amount)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute top-3 right-3 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50"
          title="削除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

// ── Tab 1: Monthly Overview ──────────────────────────────────────────────────

function MonthlyOverview({
  branchId,
  refreshKey,
}: {
  branchId?: string
  refreshKey: number
}) {
  const [month, setMonth] = useState(currentMonthString())
  const [debits, setDebits] = useState<TransferVoucher[]>([])
  const [credits, setCredits] = useState<TransferVoucher[]>([])
  const [allDebits, setAllDebits] = useState<TransferVoucher[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [d, c] = await Promise.all([
        getTransferVouchers(branchId, 'debit'),
        getTransferVouchers(branchId, 'credit'),
      ])
      setAllDebits(d)

      const first = firstDayOfMonth(month)
      const last = lastDayOfMonth(month)
      setDebits(d.filter((v) => v.voucher_date >= first && v.voucher_date <= last))
      setCredits(c.filter((v) => v.voucher_date >= first && v.voucher_date <= last))
    } catch {
      toast.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [branchId, month, refreshKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  const carryoverItems = allDebits.filter(
    (v) => v.voucher_date < firstDayOfMonth(month) && v.status === 'unsettled'
  )

  const debitTotal = debits.reduce((s, v) => s + v.total_amount, 0) +
    carryoverItems.reduce((s, v) => s + v.total_amount, 0)
  const creditTotal = credits.reduce((s, v) => s + v.total_amount, 0)
  const unsettledCount = debits.filter((v) => v.status === 'unsettled').length + carryoverItems.length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 shrink-0">対象月:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {carryoverItems.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRightLeft className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-bold text-orange-800">前月繰越</h3>
              </div>
              <p className="text-sm text-orange-700">
                {carryoverItems.length}件 {formatCurrency(carryoverItems.reduce((s, v) => s + v.total_amount, 0))}
              </p>
              <div className="mt-3 space-y-2">
                {carryoverItems.map((v) => (
                  <div key={v.id} className="bg-white/80 rounded-lg border border-orange-100 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-900">{v.customer_name}</span>
                        <span className="text-xs text-gray-500 ml-2">{v.description}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-gray-900">
                        {formatCurrency(v.total_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                借方一覧
              </h3>
              {debits.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
                  この月の借方伝票はありません
                </div>
              ) : (
                <div className="space-y-2">
                  {debits.map((v) => (
                    <VoucherCard key={v.id} voucher={v} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                貸方一覧
              </h3>
              {credits.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
                  この月の貸方伝票はありません
                </div>
              ) : (
                <div className="space-y-2">
                  {credits.map((v) => (
                    <VoucherCard key={v.id} voucher={v} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 border-t-2 border-gray-300 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <span className="text-gray-600">
                  借方合計: <strong className="text-gray-900 tabular-nums">{formatCurrency(debitTotal)}</strong>
                </span>
                <span className="text-gray-600">
                  貸方合計: <strong className="text-gray-900 tabular-nums">{formatCurrency(creditTotal)}</strong>
                </span>
              </div>
              <span className="text-gray-600">
                未照合: <strong className="text-amber-700">{unsettledCount}件</strong>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tab 2: Debit Entry Form ──────────────────────────────────────────────────

function DebitEntryForm({
  branchId,
  onSaved,
}: {
  branchId?: string
  onSaved: () => void
}) {
  const [date, setDate] = useState(todayString())
  const [customerName, setCustomerName] = useState('')
  const [description, setDescription] = useState('')
  const [weightTax, setWeightTax] = useState<string>('0')  // 選択した重量税額
  const [stamp, setStamp] = useState<string>('0')
  const [lines, setLines] = useState<DebitFormLine[]>(() =>
    Array.from({ length: 4 }, EMPTY_LINE)
  )
  const [saving, setSaving] = useState(false)

  const total = lines.reduce((s, l) => s + (parseInt(l.amount, 10) || 0), 0)

  function updateLine(idx: number, field: keyof DebitFormLine, value: string) {
    setLines((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  function addLine() {
    setLines((prev) => [...prev, EMPTY_LINE()])
  }

  function handleWeightTaxChange(tax: number) {
    setWeightTax(String(tax))
    // 重量税行を自動セット（description が「重量税」の行を更新、なければ追加）
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.description === '重量税')
      const updated = [...prev]
      if (idx >= 0) {
        updated[idx] = { description: '重量税', amount: tax > 0 ? String(tax) : '' }
      } else {
        // 最初の空行に入れる
        const emptyIdx = prev.findIndex((l) => !l.description && !l.amount)
        if (emptyIdx >= 0) {
          updated[emptyIdx] = { description: '重量税', amount: tax > 0 ? String(tax) : '' }
        } else {
          updated.push({ description: '重量税', amount: tax > 0 ? String(tax) : '' })
        }
      }
      return updated
    })
  }

  function handleStampChange(amount: number) {
    setStamp(String(amount))
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.description === '印紙代')
      const updated = [...prev]
      if (idx >= 0) {
        updated[idx] = { description: '印紙代', amount: amount > 0 ? String(amount) : '' }
      } else {
        const emptyIdx = prev.findIndex((l) => !l.description && !l.amount)
        if (emptyIdx >= 0) {
          updated[emptyIdx] = { description: '印紙代', amount: amount > 0 ? String(amount) : '' }
        } else {
          updated.push({ description: '印紙代', amount: amount > 0 ? String(amount) : '' })
        }
      }
      return updated
    })
  }

  async function handleSave() {
    if (!customerName.trim()) {
      toast.error('顧客名を入力してください')
      return
    }

    const activeLines = lines.filter((l) => l.description.trim() || l.amount.trim())
    if (activeLines.length === 0) {
      toast.error('少なくとも1行入力してください')
      return
    }

    setSaving(true)
    try {
      await createTransferVoucher({
        branch_id: branchId,
        voucher_date: date,
        customer_name: customerName.trim(),
        description: description.trim(),
        side: 'debit',
        status: 'unsettled',
        total_amount: total,
        memo: '',
        lines: activeLines.map((l, idx) => ({
          description: l.description.trim(),
          amount: parseInt(l.amount, 10) || 0,
          line_order: idx + 1,
          line_type: isAdvanceLine(l.description) ? 'advance' : 'sales',
        })),
      })
      toast.success('借方伝票を登録しました')
      setCustomerName('')
      setDescription('')
      setDate(todayString())
      setWeightTax('0')
      setStamp('0')
      setLines(Array.from({ length: 4 }, EMPTY_LINE))
      onSaved()
    } catch {
      toast.error('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="text-base font-bold text-gray-900">借方伝票 新規登録</h3>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">日付</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">顧客名</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="例: 木村"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">摘要</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例: ワゴンR車検"
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>

        {/* 法定費用クイック入力 */}
        <div className="bg-orange-50 rounded-xl border border-orange-100 p-4 space-y-3">
          <p className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
            法定費用クイック入力（立替）
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">重量税（車両区分）</label>
              <select
                value={weightTax}
                onChange={(e) => handleWeightTaxChange(parseInt(e.target.value))}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                {WEIGHT_TAX_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.tax}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">印紙代（令和7年4月改定）</label>
              <select
                value={stamp}
                onChange={(e) => handleStampChange(parseInt(e.target.value))}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              >
                {STAMP_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.amount}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-orange-600">
            選択すると明細行に自動入力されます。重量税・自賠責・印紙代は立替（±0）として記録されます。
          </p>
        </div>

        {/* Detail lines */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">内訳明細</label>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left font-medium text-gray-600 py-2 px-3 border-b border-gray-200">
                    項目名
                  </th>
                  <th className="text-center font-medium text-gray-600 py-2 px-3 border-b border-gray-200 w-16">
                    種別
                  </th>
                  <th className="text-right font-medium text-gray-600 py-2 px-3 border-b border-gray-200 w-[140px]">
                    金額
                  </th>
                  <th className="border-b border-gray-200 w-8" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  const ltype = isAdvanceLine(line.description) ? 'advance' : 'sales'
                  return (
                    <tr key={idx} className="border-t border-gray-100 hover:bg-blue-50/30 group/row">
                      <td className="p-0">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => updateLine(idx, 'description', e.target.value)}
                          placeholder="例: 検査"
                          className="w-full bg-transparent border-0 outline-none text-sm py-2 px-3 focus:bg-blue-50/50"
                        />
                      </td>
                      <td className="p-0 text-center px-2">
                        {line.description.trim() && (
                          <LineTypeBadge lineType={ltype} />
                        )}
                      </td>
                      <td className="p-0">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={line.amount}
                          onChange={(e) =>
                            updateLine(idx, 'amount', e.target.value.replace(/[^0-9]/g, ''))
                          }
                          placeholder="0"
                          className="w-full bg-transparent border-0 outline-none text-sm py-2 px-3 focus:bg-blue-50/50 text-right tabular-nums"
                        />
                      </td>
                      <td className="p-0">
                        <button
                          onClick={() => removeLine(idx)}
                          className="w-full h-full flex items-center justify-center py-2 opacity-0 group-hover/row:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                          title="この行を削除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                  <td className="py-2.5 px-3 text-sm text-gray-700">合計</td>
                  <td />
                  <td className="py-2.5 px-3 text-right tabular-nums text-sm text-gray-900">
                    {formatCurrency(total)}
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          <button
            onClick={addLine}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            行追加
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  )
}

// ── Tab 3: Payment Processing ────────────────────────────────────────────────

function PaymentProcessing({
  branchId,
  onSettled,
}: {
  branchId?: string
  onSettled: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TransferVoucher[]>([])
  const [searching, setSearching] = useState(false)
  const [settledInfo, setSettledInfo] = useState<{ amount: number } | null>(null)
  const [settlingId, setSettlingId] = useState<string | null>(null)
  const [modalVoucher, setModalVoucher] = useState<TransferVoucher | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(
    async (keyword: string) => {
      if (!keyword.trim()) {
        setResults([])
        return
      }
      setSearching(true)
      try {
        const data = await searchUnsettledVouchers(keyword.trim(), branchId)
        setResults(data)
      } catch {
        toast.error('検索に失敗しました')
      } finally {
        setSearching(false)
      }
    },
    [branchId]
  )

  function handleQueryChange(value: string) {
    setQuery(value)
    setSettledInfo(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      doSearch(value)
    }, 300)
  }

  async function handleSettle(voucher: TransferVoucher) {
    setSettlingId(voucher.id)
    try {
      const credit = await settleVoucher(voucher.id, branchId)
      if (credit) {
        toast.success('入金確認が完了しました')
        setSettledInfo({ amount: voucher.total_amount })
        setResults((prev) => prev.filter((v) => v.id !== voucher.id))
        setModalVoucher(null)
        onSettled()
      } else {
        toast.error('入金処理に失敗しました')
      }
    } catch {
      toast.error('入金処理に失敗しました')
    } finally {
      setSettlingId(null)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Settlement modal */}
      {modalVoucher && (
        <SettlementModal
          voucher={modalVoucher}
          onConfirm={() => handleSettle(modalVoucher)}
          onClose={() => setModalVoucher(null)}
          loading={settlingId === modalVoucher.id}
        />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="顧客名で検索..."
          className="h-10 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
      </div>

      {/* Settlement confirmation */}
      {settledInfo && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div className="text-sm text-green-800">
            <span className="font-bold">借方 {formatCurrency(settledInfo.amount)} = 貸方 {formatCurrency(settledInfo.amount)}</span>
            <span className="ml-2">照合完了</span>
          </div>
        </div>
      )}

      {/* Search results */}
      {searching ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : query.trim() && results.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
          未入金の借方伝票が見つかりません
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">{v.customer_name}</span>
                    <span className="text-xs text-gray-500">{v.description}</span>
                    <span className="text-xs text-gray-400">{formatDate(v.voucher_date)}</span>
                  </div>

                  {v.lines && v.lines.length > 0 && (
                    <div className="mt-2 bg-gray-50 rounded-lg p-2.5">
                      <table className="w-full text-sm">
                        <tbody>
                          {v.lines
                            .sort((a, b) => a.line_order - b.line_order)
                            .map((line, i) => {
                              const ltype = line.line_type ?? (isAdvanceLine(line.description) ? 'advance' : 'sales')
                              return (
                                <tr key={i} className="text-gray-600">
                                  <td className="py-0.5 pr-2">{line.description}</td>
                                  <td className="py-0.5 pr-2">
                                    <LineTypeBadge lineType={ltype} />
                                  </td>
                                  <td className="py-0.5 text-right tabular-nums">
                                    {formatCurrency(line.amount)}
                                  </td>
                                </tr>
                              )
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mt-2">
                    <span className="text-base font-bold tabular-nums text-gray-900">
                      合計: {formatCurrency(v.total_amount)}
                    </span>
                  </div>
                </div>

                <Button
                  onClick={() => setModalVoucher(v)}
                  disabled={settlingId === v.id}
                  className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                  size="sm"
                >
                  入金確認
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab 4: Balance Check ─────────────────────────────────────────────────────

function BalanceCheck({
  branchId,
  refreshKey,
}: {
  branchId?: string
  refreshKey: number
}) {
  const [month, setMonth] = useState(currentMonthString())
  const [debits, setDebits] = useState<TransferVoucher[]>([])
  const [credits, setCredits] = useState<TransferVoucher[]>([])
  const [allDebits, setAllDebits] = useState<TransferVoucher[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [d, c] = await Promise.all([
        getTransferVouchers(branchId, 'debit'),
        getTransferVouchers(branchId, 'credit'),
      ])
      setAllDebits(d)

      const first = firstDayOfMonth(month)
      const last = lastDayOfMonth(month)
      setDebits(d.filter((v) => v.voucher_date >= first && v.voucher_date <= last))
      setCredits(c.filter((v) => v.voucher_date >= first && v.voucher_date <= last))
    } catch {
      toast.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [branchId, month, refreshKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  const debitTotal = debits.reduce((s, v) => s + v.total_amount, 0)
  const creditTotal = credits.reduce((s, v) => s + v.total_amount, 0)
  const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01 && debitTotal > 0

  const settledDebits = debits.filter((v) => v.status === 'settled')
  const unsettledDebits = debits.filter((v) => v.status === 'unsettled')

  const carryoverFromBefore = allDebits.filter(
    (v) => v.voucher_date < firstDayOfMonth(month) && v.status === 'unsettled'
  )
  const nextMonthCarryover = [...unsettledDebits, ...carryoverFromBefore]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600 shrink-0">対象月:</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">借方合計</p>
              <p className="text-lg font-bold tabular-nums text-gray-900">
                {formatCurrency(debitTotal)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">貸方合計</p>
              <p className="text-lg font-bold tabular-nums text-gray-900">
                {formatCurrency(creditTotal)}
              </p>
            </div>
            <div
              className={cn(
                'rounded-xl border p-4',
                isBalanced
                  ? 'bg-green-50 border-green-200'
                  : debitTotal === 0 && creditTotal === 0
                  ? 'bg-white border-gray-200'
                  : 'bg-amber-50 border-amber-200'
              )}
            >
              <p className="text-xs text-gray-500 mb-1">照合状況</p>
              <p
                className={cn(
                  'text-lg font-bold',
                  isBalanced ? 'text-green-700' : 'text-amber-700'
                )}
              >
                {isBalanced ? '一致' : debitTotal === 0 && creditTotal === 0 ? '---' : '不一致'}
              </p>
            </div>
          </div>

          {settledDebits.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                照合済（入金済ペア）
              </h3>
              <div className="space-y-2">
                {settledDebits.map((v) => {
                  const matchingCredit = credits.find(
                    (c) => c.linked_voucher_id === v.id || v.linked_voucher_id === c.id
                  )
                  return (
                    <div
                      key={v.id}
                      className="bg-white rounded-xl border border-green-200 p-3 flex items-center gap-3"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-gray-900">{v.customer_name}</span>
                          <span className="text-gray-500">{v.description}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm tabular-nums shrink-0">
                        <span className="text-blue-700 font-medium">{formatCurrency(v.total_amount)}</span>
                        <ChevronRight className="w-3 h-3 text-gray-400" />
                        <span className="text-green-700 font-medium">
                          {matchingCredit ? formatCurrency(matchingCredit.total_amount) : '---'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {unsettledDebits.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-amber-500" />
                未入金
              </h3>
              <div className="space-y-2">
                {unsettledDebits.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white rounded-xl border border-amber-200 p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <StatusBadge status="unsettled" />
                      <span className="font-medium text-gray-900">{v.customer_name}</span>
                      <span className="text-gray-500">{v.description}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-gray-900">
                      {formatCurrency(v.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {nextMonthCarryover.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRightLeft className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-bold text-orange-800">来月繰越</h3>
              </div>
              <p className="text-sm text-orange-700 mb-2">
                {nextMonthCarryover.length}件 {formatCurrency(nextMonthCarryover.reduce((s, v) => s + v.total_amount, 0))}
              </p>
              <div className="space-y-1.5">
                {nextMonthCarryover.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm text-orange-800">
                    <span>{v.customer_name} - {v.description}</span>
                    <span className="tabular-nums font-medium">{formatCurrency(v.total_amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Tab 5: Voucher List ──────────────────────────────────────────────────────

function VoucherList({
  branchId,
  refreshKey,
}: {
  branchId?: string
  refreshKey: number
}) {
  const [debits, setDebits] = useState<TransferVoucher[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'unsettled' | 'settled'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTransferVouchers(branchId, 'debit')
      setDebits(data)
    } catch {
      toast.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [branchId, refreshKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = debits.filter((v) => {
    const matchStatus = filterStatus === 'all' || v.status === filterStatus
    const matchSearch =
      !searchQuery.trim() ||
      v.customer_name.includes(searchQuery) ||
      v.description.includes(searchQuery)
    return matchStatus && matchSearch
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="顧客名・摘要で絞り込み"
            className="h-9 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['all', 'unsettled', 'settled'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                filterStatus === s
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {s === 'all' ? '全て' : s === 'unsettled' ? '未入金' : '入金済'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
          該当する振替伝票はありません
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const lines = (v.lines ?? []).sort((a, b) => a.line_order - b.line_order)
            const advanceTotal = lines
              .filter((l) => (l.line_type ?? (isAdvanceLine(l.description) ? 'advance' : 'sales')) === 'advance')
              .reduce((s, l) => s + l.amount, 0)
            const salesTotal = lines
              .filter((l) => (l.line_type ?? (isAdvanceLine(l.description) ? 'advance' : 'sales')) === 'sales')
              .reduce((s, l) => s + l.amount, 0)

            return (
              <div
                key={v.id}
                className={cn(
                  'bg-white rounded-xl border p-4',
                  v.status === 'settled' ? 'border-green-200' : 'border-gray-200'
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-bold text-gray-900">{v.customer_name}</span>
                    <span className="text-xs text-gray-500 truncate">{v.description}</span>
                    <span className="text-xs text-gray-400">{formatDate(v.voucher_date)}</span>
                  </div>
                  <StatusBadge status={v.status} />
                </div>

                {/* Line items table */}
                {lines.length > 0 && (
                  <div className="bg-gray-50 rounded-lg overflow-hidden mb-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b border-gray-200">
                          <th className="text-left font-medium py-1.5 px-3">項目</th>
                          <th className="text-center font-medium py-1.5 px-2">種別</th>
                          <th className="text-right font-medium py-1.5 px-3">金額</th>
                          <th className="text-center font-medium py-1.5 px-2">収支</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {lines.map((line, i) => {
                          const ltype = line.line_type ?? (isAdvanceLine(line.description) ? 'advance' : 'sales')
                          return (
                            <tr key={i} className="text-gray-700">
                              <td className="py-1.5 px-3">{line.description}</td>
                              <td className="py-1.5 px-2 text-center">
                                <LineTypeBadge lineType={ltype} />
                              </td>
                              <td className="py-1.5 px-3 text-right tabular-nums">
                                {formatCurrency(line.amount)}
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                {ltype === 'advance' ? (
                                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                    ±0
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-green-600">売上</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Summary row */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {advanceTotal > 0 && (
                      <span>
                        立替 <span className="font-bold text-orange-700">{formatCurrency(advanceTotal)}</span>
                        <span className="text-gray-400 ml-1">(±0)</span>
                      </span>
                    )}
                    {salesTotal > 0 && (
                      <span>
                        売上 <span className="font-bold text-green-700">{formatCurrency(salesTotal)}</span>
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold tabular-nums text-gray-900">
                    合計 {formatCurrency(v.total_amount)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Count summary */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          {filtered.length}件表示
        </p>
      )}
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TransferVoucherPage() {
  const { currentBranch } = useBranchStore()
  const branchId =
    currentBranch?.id === 'all' || !currentBranch ? undefined : currentBranch.id

  const [activeTab, setActiveTab] = useState<InternalTab>('monthly')
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  return (
    <div>
      <PageHeader
        title="会計管理"
        description="振替伝票を管理します"
      />

      <AccountingTabs active="transfer-voucher" />

      {/* Internal tabs */}
      <div className="-mx-6 px-6 mb-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-max min-w-full sm:w-fit">
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'monthly' && (
        <MonthlyOverview branchId={branchId} refreshKey={refreshKey} />
      )}

      {activeTab === 'debit-entry' && (
        <DebitEntryForm branchId={branchId} onSaved={triggerRefresh} />
      )}

      {activeTab === 'payment' && (
        <PaymentProcessing branchId={branchId} onSettled={triggerRefresh} />
      )}

      {activeTab === 'balance-check' && (
        <BalanceCheck branchId={branchId} refreshKey={refreshKey} />
      )}

      {activeTab === 'voucher-list' && (
        <VoucherList branchId={branchId} refreshKey={refreshKey} />
      )}
    </div>
  )
}
