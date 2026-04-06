'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { AccountingTabs } from '@/components/shared/accounting-tabs'
import { useBranchStore } from '@/hooks/use-branch'
import {
  getSalesLedgerEntries,
  createSalesLedgerEntry,
  updateSalesLedgerEntry,
  deleteSalesLedgerEntry,
} from '@/lib/supabase/database'
import type { SalesLedgerEntry } from '@/lib/types'
import { Check, Trash2, Plus, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(val: number): string {
  if (val === 0) return '—'
  return val.toLocaleString('ja-JP')
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ── Draft row type (used for new rows not yet saved) ─────────────────────────

type DraftEntry = {
  _draftId: string
  entry_date: string
  customer_name: string
  description: string
  quantity: string
  unit_price: string
  income_amount: string
  payment_amount: string
  isSaving: boolean
}

type SavedRow = SalesLedgerEntry & { isSaving?: boolean }

// ── Row components ────────────────────────────────────────────────────────────

const INPUT_TEXT = 'w-full bg-transparent border-0 outline-none text-sm py-2 px-1 focus:bg-blue-50/50 rounded'
const INPUT_NUM = 'w-full bg-transparent border-0 outline-none text-sm py-2 px-1 text-right tabular-nums focus:bg-blue-50/50 rounded'

interface SavedRowProps {
  entry: SavedRow
  balance: number
  onDelete: (id: string) => void
  onUpdate: (id: string, field: keyof SalesLedgerEntry, value: string | number) => void
  onBlurSave: (id: string) => void
}

function SavedEntryRow({ entry, balance, onDelete, onUpdate, onBlurSave }: SavedRowProps) {
  return (
    <tr className="border-t border-gray-100 hover:bg-blue-50/30 transition-colors">
      <td className="py-1 px-3 text-center text-gray-400 text-xs w-10">{entry.line_order}</td>
      <td className="py-1 px-2 min-w-[110px]">
        <input
          type="date"
          value={entry.entry_date}
          onChange={(e) => onUpdate(entry.id, 'entry_date', e.target.value)}
          onBlur={() => onBlurSave(entry.id)}
          className={INPUT_TEXT}
        />
      </td>
      <td className="py-1 px-2 min-w-[120px]">
        <input
          type="text"
          value={entry.customer_name}
          onChange={(e) => onUpdate(entry.id, 'customer_name', e.target.value)}
          onBlur={() => onBlurSave(entry.id)}
          className={INPUT_TEXT}
          placeholder="顧客名"
        />
      </td>
      <td className="py-1 px-2 min-w-[160px]">
        <input
          type="text"
          value={entry.description}
          onChange={(e) => onUpdate(entry.id, 'description', e.target.value)}
          onBlur={() => onBlurSave(entry.id)}
          className={INPUT_TEXT}
          placeholder="摘要"
        />
      </td>
      <td className="py-1 px-2 min-w-[70px]">
        <input
          type="text"
          inputMode="numeric"
          value={entry.quantity || ''}
          onChange={(e) => onUpdate(entry.id, 'quantity', e.target.value === '' ? 0 : Number(e.target.value.replace(/[^0-9]/g, '')))}
          onBlur={() => onBlurSave(entry.id)}
          className={INPUT_NUM}
        />
      </td>
      <td className="py-1 px-2 min-w-[100px]">
        <input
          type="text"
          inputMode="numeric"
          value={entry.unit_price || ''}
          onChange={(e) => onUpdate(entry.id, 'unit_price', e.target.value === '' ? 0 : Number(e.target.value.replace(/[^0-9]/g, '')))}
          onBlur={() => onBlurSave(entry.id)}
          className={INPUT_NUM}
        />
      </td>
      <td className="py-1 px-2 min-w-[110px]">
        <input
          type="text"
          inputMode="numeric"
          value={entry.income_amount || ''}
          onChange={(e) => onUpdate(entry.id, 'income_amount', e.target.value === '' ? 0 : Number(e.target.value.replace(/[^0-9]/g, '')))}
          onBlur={() => onBlurSave(entry.id)}
          className={INPUT_NUM}
        />
      </td>
      <td className="py-1 px-2 min-w-[110px]">
        <input
          type="text"
          inputMode="numeric"
          value={entry.payment_amount || ''}
          onChange={(e) => onUpdate(entry.id, 'payment_amount', e.target.value === '' ? 0 : Number(e.target.value.replace(/[^0-9]/g, '')))}
          onBlur={() => onBlurSave(entry.id)}
          className={INPUT_NUM}
        />
      </td>
      <td
        className={cn(
          'py-2 px-3 text-right tabular-nums font-bold text-sm min-w-[110px]',
          balance < 0 ? 'text-red-600' : 'text-gray-900'
        )}
      >
        {balance.toLocaleString('ja-JP')}
      </td>
      <td className="py-1 px-2 text-center w-16">
        <div className="flex items-center justify-center gap-1">
          {entry.isSaving && (
            <span className="text-xs text-blue-400 animate-pulse">保存中</span>
          )}
          <button
            onClick={() => onDelete(entry.id)}
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="削除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

interface DraftRowProps {
  draft: DraftEntry
  lineNumber: number
  onChange: (id: string, field: keyof Omit<DraftEntry, '_draftId' | 'isSaving'>, value: string) => void
  onSave: (id: string) => void
  onDiscard: (id: string) => void
}

function DraftEntryRow({ draft, lineNumber, onChange, onSave, onDiscard }: DraftRowProps) {
  return (
    <tr className="border-t border-gray-100 bg-blue-50/20 hover:bg-blue-50/40 transition-colors">
      <td className="py-1 px-3 text-center text-gray-400 text-xs w-10">{lineNumber}</td>
      <td className="py-1 px-2 min-w-[110px]">
        <input
          type="date"
          value={draft.entry_date}
          onChange={(e) => onChange(draft._draftId, 'entry_date', e.target.value)}
          onBlur={() => onSave(draft._draftId)}
          className={INPUT_TEXT}
          autoFocus
        />
      </td>
      <td className="py-1 px-2 min-w-[120px]">
        <input
          type="text"
          value={draft.customer_name}
          onChange={(e) => onChange(draft._draftId, 'customer_name', e.target.value)}
          onBlur={() => onSave(draft._draftId)}
          className={INPUT_TEXT}
          placeholder="顧客名"
        />
      </td>
      <td className="py-1 px-2 min-w-[160px]">
        <input
          type="text"
          value={draft.description}
          onChange={(e) => onChange(draft._draftId, 'description', e.target.value)}
          onBlur={() => onSave(draft._draftId)}
          className={INPUT_TEXT}
          placeholder="摘要"
        />
      </td>
      <td className="py-1 px-2 min-w-[70px]">
        <input
          type="text"
          inputMode="numeric"
          value={draft.quantity}
          onChange={(e) => onChange(draft._draftId, 'quantity', e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={() => onSave(draft._draftId)}
          className={INPUT_NUM}
          placeholder="1"
        />
      </td>
      <td className="py-1 px-2 min-w-[100px]">
        <input
          type="text"
          inputMode="numeric"
          value={draft.unit_price}
          onChange={(e) => onChange(draft._draftId, 'unit_price', e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={() => onSave(draft._draftId)}
          className={INPUT_NUM}
          placeholder="0"
        />
      </td>
      <td className="py-1 px-2 min-w-[110px]">
        <input
          type="text"
          inputMode="numeric"
          value={draft.income_amount}
          onChange={(e) => onChange(draft._draftId, 'income_amount', e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={() => onSave(draft._draftId)}
          className={INPUT_NUM}
          placeholder="0"
        />
      </td>
      <td className="py-1 px-2 min-w-[110px]">
        <input
          type="text"
          inputMode="numeric"
          value={draft.payment_amount}
          onChange={(e) => onChange(draft._draftId, 'payment_amount', e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={() => onSave(draft._draftId)}
          className={INPUT_NUM}
          placeholder="0"
        />
      </td>
      <td className="py-2 px-3 text-right tabular-nums text-gray-400 text-sm min-w-[110px]">—</td>
      <td className="py-1 px-2 text-center w-16">
        <div className="flex items-center justify-center gap-1">
          <button
            onMouseDown={(e) => { e.preventDefault(); onSave(draft._draftId) }}
            className="p-1 rounded text-green-500 hover:bg-green-50 transition-colors"
            title="保存"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); onDiscard(draft._draftId) }}
            className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="破棄"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SalesLedgerPage() {
  const { currentBranch } = useBranchStore()
  const [entries, setEntries] = useState<SavedRow[]>([])
  const [drafts, setDrafts] = useState<DraftEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchEntries = useCallback(() => {
    setLoading(true)
    getSalesLedgerEntries(currentBranch?.id).then((data) => {
      setEntries(data as SavedRow[])
      setLoading(false)
    })
  }, [currentBranch?.id])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // ── Filter by month ──────────────────────────────────────────────────────

  const filteredEntries = entries.filter((e) => {
    if (!selectedMonth) return true
    return e.entry_date?.startsWith(selectedMonth)
  })

  // ── Running balance ──────────────────────────────────────────────────────

  const balances: number[] = []
  let running = 0
  for (const e of filteredEntries) {
    running += e.income_amount - e.payment_amount
    balances.push(running)
  }

  // ── Totals ───────────────────────────────────────────────────────────────

  const totalIncome = filteredEntries.reduce((s, e) => s + e.income_amount, 0)
  const totalPayment = filteredEntries.reduce((s, e) => s + e.payment_amount, 0)
  const totalBalance = totalIncome - totalPayment

  // ── Saved row update (optimistic) ────────────────────────────────────────

  const handleUpdate = useCallback(
    (id: string, field: keyof SalesLedgerEntry, value: string | number) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
      )
    },
    []
  )

  const handleBlurSave = useCallback(
    async (id: string) => {
      const entry = entries.find((e) => e.id === id)
      if (!entry) return
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, isSaving: true } : e))
      )
      try {
        await updateSalesLedgerEntry(id, {
          entry_date: entry.entry_date,
          customer_name: entry.customer_name,
          description: entry.description,
          quantity: entry.quantity,
          unit_price: entry.unit_price,
          income_amount: entry.income_amount,
          payment_amount: entry.payment_amount,
        })
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, isSaving: false } : e))
        )
      } catch {
        toast.error('保存に失敗しました')
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, isSaving: false } : e))
        )
      }
    },
    [entries]
  )

  // ── Delete saved row ─────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm('この行を削除しますか？')) return
      const ok = await deleteSalesLedgerEntry(id)
      if (ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id))
        toast.success('削除しました')
      } else {
        toast.error('削除に失敗しました')
      }
    },
    []
  )

  // ── Draft management ─────────────────────────────────────────────────────

  const handleAddRow = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10)
    const newDraft: DraftEntry = {
      _draftId: `draft-${Date.now()}`,
      entry_date: today,
      customer_name: '',
      description: '',
      quantity: '',
      unit_price: '',
      income_amount: '',
      payment_amount: '',
      isSaving: false,
    }
    setDrafts((prev) => [...prev, newDraft])
  }, [])

  const handleDraftChange = useCallback(
    (draftId: string, field: keyof Omit<DraftEntry, '_draftId' | 'isSaving'>, value: string) => {
      setDrafts((prev) =>
        prev.map((d) => (d._draftId === draftId ? { ...d, [field]: value } : d))
      )
    },
    []
  )

  const handleDraftSave = useCallback(
    async (draftId: string) => {
      const draft = drafts.find((d) => d._draftId === draftId)
      if (!draft) return
      // Only save if there is at least some data
      const hasData =
        draft.customer_name.trim() ||
        draft.description.trim() ||
        draft.income_amount !== '' ||
        draft.payment_amount !== ''
      if (!hasData) return

      setDrafts((prev) =>
        prev.map((d) => (d._draftId === draftId ? { ...d, isSaving: true } : d))
      )
      try {
        const nextOrder = entries.length + 1
        const saved = await createSalesLedgerEntry({
          branch_id: currentBranch?.id ?? undefined,
          entry_date: draft.entry_date || new Date().toISOString().slice(0, 10),
          customer_name: draft.customer_name,
          description: draft.description,
          quantity: draft.quantity !== '' ? Number(draft.quantity) : 1,
          unit_price: draft.unit_price !== '' ? Number(draft.unit_price) : 0,
          income_amount: draft.income_amount !== '' ? Number(draft.income_amount) : 0,
          payment_amount: draft.payment_amount !== '' ? Number(draft.payment_amount) : 0,
          line_order: nextOrder,
        })
        setEntries((prev) => [...prev, saved as SavedRow])
        setDrafts((prev) => prev.filter((d) => d._draftId !== draftId))
        toast.success('保存しました')
      } catch {
        toast.error('保存に失敗しました')
        setDrafts((prev) =>
          prev.map((d) => (d._draftId === draftId ? { ...d, isSaving: false } : d))
        )
      }
    },
    [drafts, entries.length, currentBranch?.id]
  )

  const handleDraftDiscard = useCallback((draftId: string) => {
    setDrafts((prev) => prev.filter((d) => d._draftId !== draftId))
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        title="会計管理"
        description="売上台帳を管理します"
        actions={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            印刷
          </button>
        }
      />

      <AccountingTabs active="sales-ledger" />

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 shrink-0">月:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <button
          onClick={handleAddRow}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新規追加
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: '900px' }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-3 font-medium text-gray-600 text-sm text-center w-10">No.</th>
                <th className="py-3 px-3 font-medium text-gray-600 text-sm text-left">日付</th>
                <th className="py-3 px-3 font-medium text-gray-600 text-sm text-left">顧客名</th>
                <th className="py-3 px-3 font-medium text-gray-600 text-sm text-left">摘要</th>
                <th className="py-3 px-3 font-medium text-gray-600 text-sm text-right">数量</th>
                <th className="py-3 px-3 font-medium text-gray-600 text-sm text-right">単価</th>
                <th className="py-3 px-3 font-medium text-gray-600 text-sm text-right">収入金額</th>
                <th className="py-3 px-3 font-medium text-gray-600 text-sm text-right">支払金額</th>
                <th className="py-3 px-3 font-medium text-gray-600 text-sm text-right">差引残高</th>
                <th className="py-3 px-3 font-medium text-gray-600 text-sm text-center w-16"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400 text-sm">
                    読み込み中...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 && drafts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400 text-sm">
                    データがありません。「新規追加」ボタンから行を追加してください。
                  </td>
                </tr>
              ) : (
                <>
                  {filteredEntries.map((entry, idx) => (
                    <SavedEntryRow
                      key={entry.id}
                      entry={entry}
                      balance={balances[idx] ?? 0}
                      onDelete={handleDelete}
                      onUpdate={handleUpdate}
                      onBlurSave={handleBlurSave}
                    />
                  ))}
                  {drafts.map((draft, idx) => (
                    <DraftEntryRow
                      key={draft._draftId}
                      draft={draft}
                      lineNumber={filteredEntries.length + idx + 1}
                      onChange={handleDraftChange}
                      onSave={handleDraftSave}
                      onDiscard={handleDraftDiscard}
                    />
                  ))}
                </>
              )}
            </tbody>

            {/* Summary row */}
            {(filteredEntries.length > 0 || drafts.length > 0) && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                  <td colSpan={6} className="py-3 px-3 text-sm text-gray-700">
                    合計
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-sm text-gray-900">
                    {totalIncome > 0 ? totalIncome.toLocaleString('ja-JP') : '—'}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-sm text-gray-900">
                    {totalPayment > 0 ? totalPayment.toLocaleString('ja-JP') : '—'}
                  </td>
                  <td
                    className={cn(
                      'py-3 px-3 text-right tabular-nums text-sm font-bold',
                      totalBalance < 0 ? 'text-red-600' : 'text-gray-900'
                    )}
                  >
                    {totalBalance.toLocaleString('ja-JP')}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  )
}
