'use client'

import { useState, useCallback, useId } from 'react'
import { Plus, Trash2, AlertCircle, CheckCircle2, ArrowUpDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/shared/currency-input'
import { AccountSelector } from '@/components/journal/account-selector'
import { TemplateSelector, templateToFormLines } from '@/components/journal/template-selector'
import type { Account, JournalEntry, JournalEntryLine, JournalEntryType } from '@/lib/types'
import { JOURNAL_ENTRY_TYPES } from '@/lib/constants'
import type { JournalTemplate } from '@/components/journal/template-selector'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FormLine {
  id: string
  accountId: string | null
  debitAmount: number | ''
  creditAmount: number | ''
  memo: string
}

export interface JournalEntryFormData {
  entry_date: string
  description: string
  entry_type: JournalEntryType
  status: JournalEntry['status']
  lines: FormLine[]
}

interface JournalEntryFormProps {
  accounts: Account[]
  initialData?: Partial<JournalEntryFormData>
  onSubmit: (data: JournalEntryFormData) => Promise<void>
  submitLabel?: string
  isLoading?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function newLine(id: string): FormLine {
  return { id, accountId: null, debitAmount: '', creditAmount: '', memo: '' }
}

function sumSide(lines: FormLine[], side: 'debit' | 'credit'): number {
  return lines.reduce((acc, l) => {
    const v = side === 'debit' ? l.debitAmount : l.creditAmount
    return acc + (typeof v === 'number' ? v : 0)
  }, 0)
}

function formatAmount(n: number): string {
  return n.toLocaleString('ja-JP')
}

let lineCounter = 1000

function nextId() {
  return `line-${lineCounter++}`
}

// ── Balance Indicator ─────────────────────────────────────────────────────────

function BalanceIndicator({
  totalDebit,
  totalCredit,
  className,
}: {
  totalDebit: number
  totalCredit: number
  className?: string
}) {
  const diff = totalDebit - totalCredit
  const balanced = diff === 0
  const hasValues = totalDebit > 0 || totalCredit > 0

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all duration-300',
        balanced && hasValues
          ? 'border-emerald-200 bg-emerald-50'
          : hasValues
          ? 'border-red-200 bg-red-50'
          : 'border-border bg-muted/30',
        className
      )}
    >
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="text-center">
          <div className="text-xs font-medium text-muted-foreground mb-0.5">借方合計</div>
          <div className="tabular-nums font-semibold text-foreground">¥{formatAmount(totalDebit)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-medium text-muted-foreground mb-0.5">貸方合計</div>
          <div className="tabular-nums font-semibold text-foreground">¥{formatAmount(totalCredit)}</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-medium text-muted-foreground mb-0.5">差額</div>
          <div
            className={cn(
              'tabular-nums font-bold',
              balanced && hasValues
                ? 'text-emerald-700'
                : diff !== 0 && hasValues
                ? 'text-red-600'
                : 'text-muted-foreground'
            )}
          >
            {balanced && hasValues ? (
              <span className="flex items-center justify-center gap-1">
                <CheckCircle2 className="size-3.5" />
                均衡
              </span>
            ) : (
              `¥${formatAmount(Math.abs(diff))}`
            )}
          </div>
        </div>
      </div>
      {!balanced && hasValues && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="size-3.5 shrink-0" />
          借方と貸方が一致していません
        </div>
      )}
    </div>
  )
}

// ── Desktop Line Row ──────────────────────────────────────────────────────────

function DesktopLineRow({
  line,
  accounts,
  onUpdate,
  onRemove,
  canRemove,
  index,
}: {
  line: FormLine
  accounts: Account[]
  onUpdate: (id: string, updates: Partial<FormLine>) => void
  onRemove: (id: string) => void
  canRemove: boolean
  index: number
}) {
  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="group/row"
    >
      <td className="py-2 pr-2 text-xs text-muted-foreground text-center w-8 tabular-nums">
        {index + 1}
      </td>
      <td className="py-2 pr-2 w-56">
        <AccountSelector
          accounts={accounts}
          value={line.accountId}
          onChange={(a) => onUpdate(line.id, { accountId: a.id })}
          placeholder="勘定科目"
        />
      </td>
      <td className="py-2 pr-2 w-36">
        <CurrencyInput
          value={line.debitAmount}
          onChange={(v) => onUpdate(line.id, { debitAmount: v })}
          placeholder="0"
        />
      </td>
      <td className="py-2 pr-2 w-36">
        <CurrencyInput
          value={line.creditAmount}
          onChange={(v) => onUpdate(line.id, { creditAmount: v })}
          placeholder="0"
        />
      </td>
      <td className="py-2 pr-2">
        <Input
          value={line.memo}
          onChange={(e) => onUpdate(line.id, { memo: e.target.value })}
          placeholder="摘要（任意）"
          className="h-8"
        />
      </td>
      <td className="py-2 w-10 text-right">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(line.id)}
          disabled={!canRemove}
          className="opacity-0 group-hover/row:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </td>
    </motion.tr>
  )
}

// ── Mobile Line Card ──────────────────────────────────────────────────────────

function MobileLineCard({
  line,
  accounts,
  onUpdate,
  onRemove,
  canRemove,
  index,
}: {
  line: FormLine
  accounts: Account[]
  onUpdate: (id: string, updates: Partial<FormLine>) => void
  onRemove: (id: string) => void
  canRemove: boolean
  index: number
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-xl border border-border bg-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">行 {index + 1}</span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onRemove(line.id)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-1"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      <div>
        <Label className="text-xs mb-1.5">勘定科目</Label>
        <AccountSelector
          accounts={accounts}
          value={line.accountId}
          onChange={(a) => onUpdate(line.id, { accountId: a.id })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs mb-1.5 text-blue-600">借方</Label>
          <CurrencyInput
            value={line.debitAmount}
            onChange={(v) => onUpdate(line.id, { debitAmount: v })}
            placeholder="0"
            className="h-11 text-base"
          />
        </div>
        <div>
          <Label className="text-xs mb-1.5 text-orange-600">貸方</Label>
          <CurrencyInput
            value={line.creditAmount}
            onChange={(v) => onUpdate(line.id, { creditAmount: v })}
            placeholder="0"
            className="h-11 text-base"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs mb-1.5">摘要（任意）</Label>
        <Input
          value={line.memo}
          onChange={(e) => onUpdate(line.id, { memo: e.target.value })}
          placeholder="摘要を入力"
          className="h-11"
        />
      </div>
    </motion.div>
  )
}

// ── Main Form Component ───────────────────────────────────────────────────────

export function JournalEntryForm({
  accounts,
  initialData,
  onSubmit,
  isLoading = false,
}: JournalEntryFormProps) {
  const today = new Date().toISOString().slice(0, 10)

  const [entryDate, setEntryDate] = useState(initialData?.entry_date ?? today)
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [entryType, setEntryType] = useState<JournalEntryType>(initialData?.entry_type ?? 'normal')
  const [lines, setLines] = useState<FormLine[]>(
    initialData?.lines && initialData.lines.length >= 2
      ? initialData.lines
      : [newLine(nextId()), newLine(nextId())]
  )
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const totalDebit = sumSide(lines, 'debit')
  const totalCredit = sumSide(lines, 'credit')
  const isBalanced = totalDebit === totalCredit && totalDebit > 0

  const updateLine = useCallback((id: string, updates: Partial<FormLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)))
  }, [])

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, newLine(nextId())])
  }, [])

  function handleTemplateSelect(template: JournalTemplate) {
    const tLines = templateToFormLines(template, accounts)
    setEntryType(template.entry_type)
    setLines(
      tLines.map((tl) => ({
        id: nextId(),
        accountId: tl.accountId,
        debitAmount: tl.debitAmount,
        creditAmount: tl.creditAmount,
        memo: tl.memo,
      }))
    )
  }

  function validate(): string[] {
    const errs: string[] = []
    if (!entryDate) errs.push('日付を入力してください')
    if (!description.trim()) errs.push('摘要を入力してください')
    if (lines.length < 2) errs.push('仕訳行は2行以上必要です')
    if (lines.some((l) => !l.accountId)) errs.push('すべての行に勘定科目を設定してください')
    if (lines.some((l) => (l.debitAmount === '' || l.debitAmount === 0) && (l.creditAmount === '' || l.creditAmount === 0)))
      errs.push('各行に借方または貸方の金額を入力してください')
    if (totalDebit !== totalCredit) errs.push('借方合計と貸方合計が一致していません')
    if (totalDebit === 0) errs.push('金額を入力してください')
    return errs
  }

  async function handleSubmit(status: JournalEntry['status']) {
    const errs = validate()
    if (errs.length) {
      setErrors(errs)
      return
    }
    setErrors([])
    setSubmitting(true)
    try {
      await onSubmit({
        entry_date: entryDate,
        description,
        entry_type: entryType,
        status,
        lines,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const busy = submitting || isLoading

  return (
    <div className="space-y-6">
      {/* ── Header fields ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Date */}
        <div className="space-y-1.5">
          <Label htmlFor="entry-date">日付 <span className="text-destructive">*</span></Label>
          <Input
            id="entry-date"
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            className="h-8"
          />
        </div>

        {/* Entry type */}
        <div className="space-y-1.5">
          <Label>種別 <span className="text-destructive">*</span></Label>
          <div className="flex gap-1.5 flex-wrap">
            {(Object.entries(JOURNAL_ENTRY_TYPES) as [JournalEntryType, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setEntryType(key)}
                className={cn(
                  'rounded-lg border px-3 py-1 text-sm font-medium transition-all',
                  entryType === key
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Template - spans remaining */}
        <div className="space-y-1.5 flex flex-col justify-end">
          <TemplateSelector accounts={accounts} onSelect={handleTemplateSelect} />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">摘要 <span className="text-destructive">*</span></Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="仕訳の内容を入力してください"
          className="h-8"
        />
      </div>

      {/* ── Lines ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ArrowUpDown className="size-4 text-muted-foreground" />
            仕訳明細
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">借方</span>
            <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 font-medium">貸方</span>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="py-2.5 px-2 text-xs font-medium text-muted-foreground text-center w-8">#</th>
                <th className="py-2.5 px-2 text-xs font-medium text-muted-foreground text-left">勘定科目</th>
                <th className="py-2.5 px-2 text-xs font-medium text-blue-600 text-left w-36">借方金額</th>
                <th className="py-2.5 px-2 text-xs font-medium text-orange-600 text-left w-36">貸方金額</th>
                <th className="py-2.5 px-2 text-xs font-medium text-muted-foreground text-left">摘要</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 px-2">
              <AnimatePresence>
                {lines.map((line, i) => (
                  <DesktopLineRow
                    key={line.id}
                    line={line}
                    accounts={accounts}
                    onUpdate={updateLine}
                    onRemove={removeLine}
                    canRemove={lines.length > 2}
                    index={i}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          <div className="border-t border-border px-4 py-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addLine}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <Plus className="size-3.5" />
              行を追加
            </Button>
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          <AnimatePresence>
            {lines.map((line, i) => (
              <MobileLineCard
                key={line.id}
                line={line}
                accounts={accounts}
                onUpdate={updateLine}
                onRemove={removeLine}
                canRemove={lines.length > 2}
                index={i}
              />
            ))}
          </AnimatePresence>
          <Button
            type="button"
            variant="outline"
            onClick={addLine}
            className="w-full gap-2 h-11 border-dashed"
          >
            <Plus className="size-4" />
            行を追加
          </Button>
        </div>
      </div>

      {/* ── Balance indicator ── */}
      <BalanceIndicator
        totalDebit={totalDebit}
        totalCredit={totalCredit}
        className="md:sticky md:bottom-0"
      />

      {/* ── Validation errors ── */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="size-4 text-destructive shrink-0" />
              <span className="text-sm font-medium text-destructive">入力内容を確認してください</span>
            </div>
            <ul className="space-y-1 ml-6 list-disc">
              {errors.map((e, i) => (
                <li key={i} className="text-sm text-destructive/80">{e}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Submit buttons ── */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSubmit('draft')}
          disabled={busy}
          className="w-full sm:w-auto gap-2"
        >
          下書き保存
        </Button>
        <Button
          type="button"
          onClick={() => handleSubmit('posted')}
          disabled={busy || !isBalanced}
          className={cn(
            'w-full sm:w-auto gap-2 bg-primary text-primary-foreground',
            isBalanced && 'shadow-md shadow-primary/20'
          )}
        >
          {busy ? '保存中...' : '承認・投稿'}
        </Button>
      </div>
    </div>
  )
}
