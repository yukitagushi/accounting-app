'use client'

import { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { AccountingTabs } from '@/components/shared/accounting-tabs'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { useBranchStore } from '@/hooks/use-branch'
import {
  getTransferVouchers,
  createTransferVoucher,
  updateTransferVoucher,
  deleteTransferVoucher,
} from '@/lib/supabase/database'
import type { TransferVoucher, TransferVoucherLine } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Plus,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  FileText,
  ChevronLeft,
} from 'lucide-react'

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

function currentMonthString(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'create' | 'edit'

interface FormLine {
  id?: string
  debit_amount: string
  debit_account: string
  description: string
  credit_account: string
  credit_amount: string
}

interface VoucherForm {
  voucher_date: string
  memo: string
  lines: FormLine[]
}

const EMPTY_LINE = (): FormLine => ({
  debit_amount: '',
  debit_account: '',
  description: '',
  credit_account: '',
  credit_amount: '',
})

const INITIAL_FORM = (): VoucherForm => ({
  voucher_date: todayString(),
  memo: '',
  lines: Array.from({ length: 5 }, EMPTY_LINE),
})

function formToSavePayload(form: VoucherForm, branchId?: string) {
  const activeLines = form.lines.filter(
    (l) =>
      l.debit_amount !== '' ||
      l.debit_account !== '' ||
      l.description !== '' ||
      l.credit_account !== '' ||
      l.credit_amount !== ''
  )
  const lines = activeLines.map((l, idx) => ({
    id: l.id,
    debit_amount: parseFloat(l.debit_amount) || 0,
    debit_account: l.debit_account,
    description: l.description,
    credit_account: l.credit_account,
    credit_amount: parseFloat(l.credit_amount) || 0,
    line_order: idx + 1,
  }))
  const total = lines.reduce((s, l) => s + l.debit_amount, 0)
  return {
    branch_id: branchId,
    voucher_date: form.voucher_date,
    memo: form.memo,
    total_amount: total,
    lines: lines as Partial<TransferVoucherLine>[],
  }
}

function voucherToForm(v: TransferVoucher): VoucherForm {
  const lines: FormLine[] = (v.lines ?? []).map((l) => ({
    id: l.id,
    debit_amount: (l.debit_amount ?? 0) > 0 ? String(l.debit_amount) : '',
    debit_account: l.debit_account ?? '',
    description: l.description ?? '',
    credit_account: l.credit_account ?? '',
    credit_amount: (l.credit_amount ?? 0) > 0 ? String(l.credit_amount) : '',
  }))
  // Pad to at least 5 rows
  while (lines.length < 5) lines.push(EMPTY_LINE())
  return {
    voucher_date: v.voucher_date,
    memo: v.memo ?? '',
    lines,
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function VoucherCard({
  voucher,
  onClick,
  onDelete,
}: {
  voucher: TransferVoucher
  onClick: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer relative group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              No.{voucher.voucher_number}
            </span>
            <span className="text-xs text-gray-500">{formatDate(voucher.voucher_date)}</span>
          </div>
          {voucher.memo && (
            <p className="text-sm text-gray-700 truncate">{voucher.memo}</p>
          )}
          {!voucher.memo && (
            <p className="text-sm text-gray-400 italic">摘要なし</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold tabular-nums text-gray-900">
            ¥{voucher.total_amount.toLocaleString('ja-JP')}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {(voucher.lines?.length ?? 0)} 行
          </p>
        </div>
      </div>

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
    </div>
  )
}

// ── Voucher Form (paper-style) ────────────────────────────────────────────────

function VoucherFormView({
  form,
  setForm,
  editingVoucher,
  onSave,
  onCancel,
  saving,
}: {
  form: VoucherForm
  setForm: React.Dispatch<React.SetStateAction<VoucherForm>>
  editingVoucher: TransferVoucher | null
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const debitTotal = form.lines.reduce(
    (s, l) => s + (parseFloat(l.debit_amount) || 0),
    0
  )
  const creditTotal = form.lines.reduce(
    (s, l) => s + (parseFloat(l.credit_amount) || 0),
    0
  )
  const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01

  function updateLine(idx: number, field: keyof FormLine, value: string) {
    setForm((prev) => {
      const lines = [...prev.lines]
      lines[idx] = { ...lines[idx], [field]: value }
      return { ...prev, lines }
    })
  }

  function removeLine(idx: number) {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== idx),
    }))
  }

  function addLine() {
    setForm((prev) => ({ ...prev, lines: [...prev.lines, EMPTY_LINE()] }))
  }

  const dateParts = form.voucher_date
    ? (() => {
        const d = new Date(form.voucher_date)
        return {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          day: d.getDate(),
        }
      })()
    : { year: '—', month: '—', day: '—' }

  return (
    <div className="space-y-4">
      {/* Paper form card */}
      <div className="bg-white rounded-xl border border-gray-300 overflow-hidden shadow-sm">
        {/* Form Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold tracking-wider text-gray-900">振替伝票</h2>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            {editingVoucher && (
              <span className="font-mono text-gray-500 text-xs">
                No.{editingVoucher.voucher_number}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={form.voucher_date}
                onChange={(e) => setForm((p) => ({ ...p, voucher_date: e.target.value }))}
                className="h-7 rounded border border-gray-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {dateParts.year}年{dateParts.month}月{dateParts.day}日
              </span>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 text-center font-bold text-sm py-2 px-3 w-[18%]">
                  金　額
                </th>
                <th className="border border-gray-300 text-center font-bold text-sm py-2 px-3 w-[20%]">
                  借方科目
                </th>
                <th className="border border-gray-300 text-center font-bold text-sm py-2 px-3 w-[24%]">
                  摘　要
                </th>
                <th className="border border-gray-300 text-center font-bold text-sm py-2 px-3 w-[20%]">
                  貸方科目
                </th>
                <th className="border border-gray-300 text-center font-bold text-sm py-2 px-3 w-[18%]">
                  金　額
                </th>
                <th className="border border-gray-300 bg-gray-100 py-2 w-8" aria-label="削除" />
              </tr>
            </thead>
            <tbody>
              {form.lines.map((line, idx) => (
                <tr key={idx} className="group/row">
                  <td className="border border-gray-300 p-0">
                    <input
                      type="number"
                      min="0"
                      value={line.debit_amount}
                      onChange={(e) => updateLine(idx, 'debit_amount', e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent border-0 outline-none text-sm py-2 px-2 focus:bg-blue-50/50 text-right tabular-nums"
                    />
                  </td>
                  <td className="border border-gray-300 p-0">
                    <input
                      type="text"
                      value={line.debit_account}
                      onChange={(e) => updateLine(idx, 'debit_account', e.target.value)}
                      placeholder="例: 現金"
                      className="w-full bg-transparent border-0 outline-none text-sm py-2 px-2 focus:bg-blue-50/50"
                    />
                  </td>
                  <td className="border border-gray-300 p-0">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(idx, 'description', e.target.value)}
                      placeholder="摘要"
                      className="w-full bg-transparent border-0 outline-none text-sm py-2 px-2 focus:bg-blue-50/50"
                    />
                  </td>
                  <td className="border border-gray-300 p-0">
                    <input
                      type="text"
                      value={line.credit_account}
                      onChange={(e) => updateLine(idx, 'credit_account', e.target.value)}
                      placeholder="例: 売上"
                      className="w-full bg-transparent border-0 outline-none text-sm py-2 px-2 focus:bg-blue-50/50"
                    />
                  </td>
                  <td className="border border-gray-300 p-0">
                    <input
                      type="number"
                      min="0"
                      value={line.credit_amount}
                      onChange={(e) => updateLine(idx, 'credit_amount', e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent border-0 outline-none text-sm py-2 px-2 focus:bg-blue-50/50 text-right tabular-nums"
                    />
                  </td>
                  <td className="border border-gray-300 p-0 w-8">
                    <button
                      onClick={() => removeLine(idx)}
                      className="w-full h-full flex items-center justify-center py-2 opacity-0 group-hover/row:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                      title="この行を削除"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Totals row */}
              <tr className="bg-gray-50 border-t-2 border-gray-400">
                <td className="border border-gray-300 py-2.5 px-3 text-right tabular-nums font-bold text-sm">
                  {debitTotal > 0 ? debitTotal.toLocaleString('ja-JP') : '—'}
                </td>
                <td className="border border-gray-300" />
                <td className="border border-gray-300 text-center font-bold text-sm py-2.5 text-gray-700 tracking-widest">
                  合　計
                </td>
                <td className="border border-gray-300" />
                <td className="border border-gray-300 py-2.5 px-3 text-right tabular-nums font-bold text-sm">
                  {creditTotal > 0 ? creditTotal.toLocaleString('ja-JP') : '—'}
                </td>
                <td className="border border-gray-300" />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Below-table controls */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-white">
          <button
            onClick={addLine}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            行追加
          </button>

          {/* Balance indicator */}
          <div
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border',
              isBalanced && (debitTotal > 0 || creditTotal > 0)
                ? 'bg-green-50 border-green-200 text-green-700'
                : debitTotal === 0 && creditTotal === 0
                ? 'bg-gray-50 border-gray-200 text-gray-500'
                : 'bg-red-50 border-red-200 text-red-700'
            )}
          >
            {isBalanced && (debitTotal > 0 || creditTotal > 0) ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : debitTotal === 0 && creditTotal === 0 ? null : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            {isBalanced && (debitTotal > 0 || creditTotal > 0)
              ? '貸借一致'
              : debitTotal === 0 && creditTotal === 0
              ? '未入力'
              : `差額: ¥${Math.abs(debitTotal - creditTotal).toLocaleString('ja-JP')}`}
          </div>
        </div>
      </div>

      {/* Memo field */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
        <label className="block text-xs font-medium text-gray-500 mb-1.5">摘要・備考</label>
        <textarea
          value={form.memo}
          onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
          placeholder="伝票全体の備考を入力"
          rows={2}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          キャンセル
        </Button>
        <Button
          onClick={onSave}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TransferVoucherPage() {
  const { currentBranch } = useBranchStore()
  const branchId =
    currentBranch?.id === 'all' || !currentBranch ? undefined : currentBranch.id

  const [vouchers, setVouchers] = useState<TransferVoucher[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewMode>('list')
  const [editingVoucher, setEditingVoucher] = useState<TransferVoucher | null>(null)
  const [form, setForm] = useState<VoucherForm>(INITIAL_FORM())
  const [saving, setSaving] = useState(false)
  const [monthFilter, setMonthFilter] = useState(currentMonthString())

  const loadVouchers = useCallback(() => {
    setLoading(true)
    getTransferVouchers(branchId)
      .then((data) => {
        setVouchers(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        toast.error('データの取得に失敗しました')
      })
  }, [branchId])

  useEffect(() => {
    loadVouchers()
  }, [loadVouchers])

  // Filter by selected month
  const filteredVouchers = vouchers.filter((v) => {
    if (!monthFilter) return true
    return v.voucher_date.startsWith(monthFilter)
  })

  function handleNewClick() {
    setEditingVoucher(null)
    setForm(INITIAL_FORM())
    setView('create')
  }

  function handleEditClick(v: TransferVoucher) {
    setEditingVoucher(v)
    setForm(voucherToForm(v))
    setView('edit')
  }

  function handleCancel() {
    setView('list')
    setEditingVoucher(null)
    setForm(INITIAL_FORM())
  }

  async function handleDelete(id: string) {
    if (!confirm('この振替伝票を削除しますか？')) return
    const ok = await deleteTransferVoucher(id)
    if (ok) {
      toast.success('振替伝票を削除しました')
      loadVouchers()
    } else {
      toast.error('削除に失敗しました')
    }
  }

  async function handleSave() {
    const activeLines = form.lines.filter(
      (l) =>
        l.debit_amount !== '' ||
        l.debit_account !== '' ||
        l.description !== '' ||
        l.credit_account !== '' ||
        l.credit_amount !== ''
    )

    if (activeLines.length === 0) {
      toast.error('少なくとも1行入力してください')
      return
    }

    const debitTotal = activeLines.reduce((s, l) => s + (parseFloat(l.debit_amount) || 0), 0)
    const creditTotal = activeLines.reduce((s, l) => s + (parseFloat(l.credit_amount) || 0), 0)

    if (Math.abs(debitTotal - creditTotal) >= 0.01) {
      toast.error('借方合計と貸方合計が一致しません')
      return
    }

    setSaving(true)
    try {
      const payload = formToSavePayload(form, branchId)

      if (view === 'edit' && editingVoucher) {
        const updated = await updateTransferVoucher(editingVoucher.id, payload)
        if (updated) {
          toast.success('振替伝票を更新しました')
          loadVouchers()
          setView('list')
          setEditingVoucher(null)
        } else {
          toast.error('更新に失敗しました')
        }
      } else {
        await createTransferVoucher(payload)
        toast.success('振替伝票を作成しました')
        loadVouchers()
        setView('list')
      }
    } catch {
      toast.error('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="会計管理"
        description="振替伝票を管理します"
        actions={
          view === 'list' ? (
            <Button
              onClick={handleNewClick}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              新規作成
            </Button>
          ) : (
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              一覧に戻る
            </button>
          )
        }
      />

      <AccountingTabs active="transfer-voucher" />

      {/* List View */}
      {view === 'list' && (
        <div>
          {/* Month filter */}
          <div className="flex items-center gap-2 mb-5">
            <label className="text-sm text-gray-600 shrink-0">対象月:</label>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            {monthFilter && (
              <button
                onClick={() => setMonthFilter('')}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                クリア
              </button>
            )}
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-lg bg-gray-100 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <EmptyState
                icon={FileText}
                title="振替伝票がありません"
                description={
                  monthFilter
                    ? 'この月の振替伝票はまだ登録されていません'
                    : '振替伝票がまだ登録されていません'
                }
                actionLabel="新規作成"
                onAction={handleNewClick}
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVouchers.map((v) => (
                <VoucherCard
                  key={v.id}
                  voucher={v}
                  onClick={() => handleEditClick(v)}
                  onDelete={() => handleDelete(v.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit View */}
      {(view === 'create' || view === 'edit') && (
        <VoucherFormView
          form={form}
          setForm={setForm}
          editingVoucher={editingVoucher}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
        />
      )}
    </div>
  )
}
