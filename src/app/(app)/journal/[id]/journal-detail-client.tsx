'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Edit2,
  Ban,
  Trash2,
  CheckCircle2,
  Calendar,
  User,
  Clock,
  Save,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { JournalEntryForm } from '@/components/journal/journal-entry-form'
import { voidJournalEntry, updateJournalEntry } from '@/lib/mock-data'
import type { JournalEntry, Account, JournalEntryLine } from '@/lib/types'
import type { JournalEntryFormData, FormLine } from '@/components/journal/journal-entry-form'
import { JOURNAL_ENTRY_TYPES } from '@/lib/constants'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${y}年${Number(m)}月${Number(d)}日`
}

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatAmount(n: number): string {
  return n.toLocaleString('ja-JP')
}

// ── Line table ────────────────────────────────────────────────────────────────

function LinesTable({ lines }: { lines: JournalEntryLine[] }) {
  const totalDebit = lines.reduce((s, l) => s + l.debit_amount, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit_amount, 0)

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground text-left w-8">#</th>
              <th className="py-3 px-3 text-xs font-semibold text-muted-foreground text-left">勘定科目</th>
              <th className="py-3 px-3 text-xs font-semibold text-blue-600 text-right w-36">借方</th>
              <th className="py-3 px-3 text-xs font-semibold text-orange-600 text-right w-36">貸方</th>
              <th className="py-3 px-4 text-xs font-semibold text-muted-foreground text-left">摘要</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {lines.map((line, i) => (
              <tr key={line.id} className="hover:bg-muted/20 transition-colors">
                <td className="py-3 px-4 text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{line.account?.code}</span>
                    <span className="font-medium">{line.account?.name}</span>
                  </div>
                </td>
                <td className={cn('py-3 px-3 text-right tabular-nums font-medium', line.debit_amount > 0 ? 'text-blue-700' : 'text-muted-foreground/40')}>
                  {line.debit_amount > 0 ? `¥${formatAmount(line.debit_amount)}` : '—'}
                </td>
                <td className={cn('py-3 px-3 text-right tabular-nums font-medium', line.credit_amount > 0 ? 'text-orange-700' : 'text-muted-foreground/40')}>
                  {line.credit_amount > 0 ? `¥${formatAmount(line.credit_amount)}` : '—'}
                </td>
                <td className="py-3 px-4 text-muted-foreground">{line.description || '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/20">
              <td colSpan={2} className="py-3 px-4 text-xs font-semibold text-muted-foreground text-right">合計</td>
              <td className="py-3 px-3 text-right tabular-nums font-bold text-blue-700">¥{formatAmount(totalDebit)}</td>
              <td className="py-3 px-3 text-right tabular-nums font-bold text-orange-700">¥{formatAmount(totalCredit)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-2">
        {lines.map((line, i) => (
          <div key={line.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-xs text-muted-foreground font-mono mr-2">{line.account?.code}</span>
                <span className="text-sm font-semibold">{line.account?.name}</span>
              </div>
              <span className="text-xs text-muted-foreground">行 {i + 1}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-blue-600 font-medium mb-0.5">借方</p>
                <p className={cn('tabular-nums text-sm font-semibold', line.debit_amount > 0 ? 'text-blue-700' : 'text-muted-foreground/50')}>
                  {line.debit_amount > 0 ? `¥${formatAmount(line.debit_amount)}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-orange-600 font-medium mb-0.5">貸方</p>
                <p className={cn('tabular-nums text-sm font-semibold', line.credit_amount > 0 ? 'text-orange-700' : 'text-muted-foreground/50')}>
                  {line.credit_amount > 0 ? `¥${formatAmount(line.credit_amount)}` : '—'}
                </p>
              </div>
            </div>
            {line.description && (
              <p className="mt-2 text-xs text-muted-foreground">{line.description}</p>
            )}
          </div>
        ))}

        {/* Totals */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <p className="text-xs text-blue-600 font-medium mb-0.5">借方合計</p>
              <p className="tabular-nums font-bold text-blue-700">¥{formatAmount(totalDebit)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-orange-600 font-medium mb-0.5">貸方合計</p>
              <p className="tabular-nums font-bold text-orange-700">¥{formatAmount(totalCredit)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  entry: JournalEntry
  accounts: Account[]
}

export function JournalDetailClient({ entry: initialEntry, accounts }: Props) {
  const router = useRouter()
  const [entry, setEntry] = useState(initialEntry)
  const [editing, setEditing] = useState(false)
  const [voidConfirm, setVoidConfirm] = useState(false)
  const [isBusy, setIsBusy] = useState(false)

  const lines = entry.lines ?? []
  const isVoid = entry.status === 'void'
  const isPosted = entry.status === 'posted'

  async function handleVoid() {
    setIsBusy(true)
    try {
      const updated = await voidJournalEntry(entry.id)
      if (updated) {
        setEntry(updated)
        toast.success('仕訳を無効にしました')
      } else {
        toast.error('更新に失敗しました')
      }
    } finally {
      setIsBusy(false)
      setVoidConfirm(false)
    }
  }

  async function handleUpdate(data: JournalEntryFormData) {
    try {
      const newLines: JournalEntryLine[] = data.lines
        .filter((l: FormLine) => l.accountId)
        .map((l: FormLine, i: number) => ({
          id: `${entry.id}-l${i + 1}`,
          journal_entry_id: entry.id,
          account_id: l.accountId!,
          debit_amount: typeof l.debitAmount === 'number' ? l.debitAmount : 0,
          credit_amount: typeof l.creditAmount === 'number' ? l.creditAmount : 0,
          description: l.memo,
          line_order: i + 1,
          account: accounts.find((a) => a.id === l.accountId),
        }))

      const updated = await updateJournalEntry(entry.id, {
        entry_date: data.entry_date,
        description: data.description,
        entry_type: data.entry_type,
        status: data.status,
        lines: newLines,
      })

      if (updated) {
        setEntry(updated)
        setEditing(false)
        toast.success(data.status === 'posted' ? '仕訳を承認しました' : '下書きとして保存しました')
      } else {
        toast.error('更新に失敗しました')
      }
    } catch {
      toast.error('更新に失敗しました')
    }
  }

  // ── Edit mode ──
  if (editing) {
    const initialFormData: Partial<JournalEntryFormData> = {
      entry_date: entry.entry_date,
      description: entry.description,
      entry_type: entry.entry_type,
      status: entry.status,
      lines: lines.map((l) => ({
        id: l.id,
        accountId: l.account_id,
        debitAmount: l.debit_amount || '',
        creditAmount: l.credit_amount || '',
        memo: l.description,
      })),
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">仕訳を編集</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
            className="gap-1.5 text-muted-foreground"
          >
            <X className="size-4" />
            キャンセル
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <JournalEntryForm
            accounts={accounts}
            initialData={initialFormData}
            onSubmit={handleUpdate}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Header card ── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={entry.status} />
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    entry.entry_type === 'normal'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : entry.entry_type === 'transfer'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  )}
                >
                  {JOURNAL_ENTRY_TYPES[entry.entry_type]}
                </span>
              </div>
              <CardTitle className="text-lg">{entry.description}</CardTitle>
            </div>

            {/* Actions */}
            {!isVoid && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="gap-1.5"
                >
                  <Edit2 className="size-3.5" />
                  編集
                </Button>
                {!voidConfirm ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setVoidConfirm(true)}
                    className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    <Ban className="size-3.5" />
                    無効化
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-1.5">
                    <span className="text-xs text-destructive font-medium">本当に無効にしますか？</span>
                    <Button
                      type="button"
                      size="xs"
                      onClick={handleVoid}
                      disabled={isBusy}
                      className="bg-destructive text-white hover:bg-destructive/90 gap-1"
                    >
                      <Ban className="size-3" />
                      無効化
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => setVoidConfirm(false)}
                    >
                      キャンセル
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">日付</p>
                <p className="text-sm font-medium">{formatDate(entry.entry_date)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">作成者</p>
                <p className="text-sm font-medium">{entry.created_by}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">作成日時</p>
                <p className="text-sm font-medium">{formatDateTime(entry.created_at)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Lines ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">仕訳明細</CardTitle>
        </CardHeader>
        <CardContent>
          {lines.length > 0 ? (
            <LinesTable lines={lines} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">仕訳明細がありません</p>
          )}
        </CardContent>
      </Card>

      {/* ── Post action (if draft) ── */}
      {entry.status === 'draft' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
        >
          <div>
            <p className="text-sm font-medium text-amber-800">この仕訳は下書きです</p>
            <p className="text-xs text-amber-700 mt-0.5">承認すると会計帳簿に反映されます</p>
          </div>
          <Button
            type="button"
            onClick={async () => {
              setIsBusy(true)
              try {
                const updated = await updateJournalEntry(entry.id, { status: 'posted' })
                if (updated) {
                  setEntry(updated)
                  toast.success('仕訳を承認しました')
                } else {
                  toast.error('更新に失敗しました')
                }
              } finally {
                setIsBusy(false)
              }
            }}
            disabled={isBusy}
            className="gap-2 bg-primary text-primary-foreground shrink-0"
            size="sm"
          >
            <CheckCircle2 className="size-4" />
            承認・投稿
          </Button>
        </motion.div>
      )}
    </div>
  )
}
