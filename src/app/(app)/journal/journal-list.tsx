'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  SlidersHorizontal,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { CSVExportDialog } from '@/components/shared/csv-export-dialog'
import { exportJournalEntries } from '@/lib/csv-export'
import type { JournalEntry, Account, JournalEntryType, JournalEntryStatus } from '@/lib/types'
import { JOURNAL_ENTRY_TYPES } from '@/lib/constants'

const PAGE_SIZE = 10

interface JournalListProps {
  initialEntries: JournalEntry[]
  accounts: Account[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function formatAmount(n: number): string {
  return n.toLocaleString('ja-JP')
}

function getEntryTotals(entry: JournalEntry) {
  const lines = entry.lines ?? []
  const totalDebit = lines.reduce((s, l) => s + l.debit_amount, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit_amount, 0)
  const debitAccounts = lines.filter((l) => l.debit_amount > 0).map((l) => l.account?.name ?? '').filter(Boolean)
  const creditAccounts = lines.filter((l) => l.credit_amount > 0).map((l) => l.account?.name ?? '').filter(Boolean)
  return { totalDebit, totalCredit, debitAccounts, creditAccounts }
}

const ENTRY_TYPE_COLORS: Record<JournalEntryType, string> = {
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  transfer: 'bg-purple-50 text-purple-700 border-purple-200',
  vehicle_inspection: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

// ── Row ───────────────────────────────────────────────────────────────────────

function DesktopRow({ entry, onClick }: { entry: JournalEntry; onClick: () => void }) {
  const { totalDebit, totalCredit, debitAccounts, creditAccounts } = getEntryTotals(entry)

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'group cursor-pointer border-b border-border/50 transition-colors hover:bg-accent/30',
        entry.status === 'void' && 'opacity-50'
      )}
      onClick={onClick}
    >
      <td className="py-3 pl-4 pr-2 text-sm tabular-nums text-muted-foreground w-24">
        {formatDate(entry.entry_date)}
      </td>
      <td className="py-3 px-2">
        <div className="text-sm font-medium text-foreground truncate max-w-[200px]">{entry.description}</div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
          {debitAccounts.slice(0, 2).join('、')}
          {debitAccounts.length > 2 && ' 他'}
          {' → '}
          {creditAccounts.slice(0, 2).join('、')}
          {creditAccounts.length > 2 && ' 他'}
        </div>
      </td>
      <td className="py-3 px-2 text-right tabular-nums text-sm">
        <span className="text-blue-700 font-medium">¥{formatAmount(totalDebit)}</span>
      </td>
      <td className="py-3 px-2 text-right tabular-nums text-sm">
        <span className="text-orange-700 font-medium">¥{formatAmount(totalCredit)}</span>
      </td>
      <td className="py-3 px-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
            ENTRY_TYPE_COLORS[entry.entry_type]
          )}
        >
          {JOURNAL_ENTRY_TYPES[entry.entry_type]}
        </span>
      </td>
      <td className="py-3 pl-2 pr-4">
        <StatusBadge status={entry.status} />
      </td>
    </motion.tr>
  )
}

function MobileCard({ entry, onClick }: { entry: JournalEntry; onClick: () => void }) {
  const { totalDebit, debitAccounts, creditAccounts } = getEntryTotals(entry)

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border border-border bg-card p-4 transition-all active:scale-[0.98] hover:border-primary/30 hover:shadow-sm',
        entry.status === 'void' && 'opacity-50'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{entry.description}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(entry.entry_date)}</p>
        </div>
        <StatusBadge status={entry.status} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-xs font-medium',
            ENTRY_TYPE_COLORS[entry.entry_type]
          )}
        >
          {JOURNAL_ENTRY_TYPES[entry.entry_type]}
        </span>
        <span className="text-xs text-muted-foreground">
          {debitAccounts.slice(0, 1).join('')}
          {debitAccounts.length > 1 && ' 他'}
          {' → '}
          {creditAccounts.slice(0, 1).join('')}
          {creditAccounts.length > 1 && ' 他'}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-end">
        <span className="tabular-nums text-sm font-semibold text-foreground">
          ¥{formatAmount(totalDebit)}
        </span>
      </div>
    </motion.button>
  )
}

// ── Filter bar ────────────────────────────────────────────────────────────────

interface Filters {
  search: string
  type: JournalEntryType | ''
  status: JournalEntryStatus | ''
  dateFrom: string
  dateTo: string
}

const STATUSES: Array<{ key: JournalEntryStatus; label: string }> = [
  { key: 'draft', label: '下書き' },
  { key: 'posted', label: '承認済み' },
  { key: 'void', label: '無効' },
]

// ── Main component ────────────────────────────────────────────────────────────

export function JournalList({ initialEntries, accounts }: JournalListProps) {
  const router = useRouter()
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  })
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    return initialEntries.filter((e) => {
      if (filters.type && e.entry_type !== filters.type) return false
      if (filters.status && e.status !== filters.status) return false
      if (filters.dateFrom && e.entry_date < filters.dateFrom) return false
      if (filters.dateTo && e.entry_date > filters.dateTo) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        const matchDesc = e.description.toLowerCase().includes(q)
        const matchAcct = (e.lines ?? []).some((l) => l.account?.name.toLowerCase().includes(q))
        if (!matchDesc && !matchAcct) return false
      }
      return true
    })
  }, [initialEntries, filters])

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1)),
    [filtered]
  )

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const hasActiveFilters = filters.type || filters.status || filters.dateFrom || filters.dateTo

  return (
    <div className="space-y-4">
      {/* ── Search + Filter toggle ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="摘要・勘定科目で検索..."
            className="pl-9 h-9"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'gap-1.5 h-9',
            hasActiveFilters && 'border-primary text-primary bg-primary/5'
          )}
        >
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">フィルター</span>
          {hasActiveFilters && (
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
              {[filters.type, filters.status, filters.dateFrom, filters.dateTo].filter(Boolean).length}
            </span>
          )}
        </Button>
      </div>

      {/* ── Filter panel ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-card p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">種別</label>
                <select
                  value={filters.type}
                  onChange={(e) => updateFilter('type', e.target.value as JournalEntryType | '')}
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">すべて</option>
                  {(Object.entries(JOURNAL_ENTRY_TYPES) as [JournalEntryType, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">ステータス</label>
                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value as JournalEntryStatus | '')}
                  className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  <option value="">すべて</option>
                  {STATUSES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Date from */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">日付（開始）</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => updateFilter('dateFrom', e.target.value)}
                    className="pl-8 h-8"
                  />
                </div>
              </div>

              {/* Date to */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">日付（終了）</label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => updateFilter('dateTo', e.target.value)}
                    className="pl-8 h-8"
                  />
                </div>
              </div>

              {/* Reset */}
              <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilters({ search: '', type: '', status: '', dateFrom: '', dateTo: '' })
                    setPage(1)
                  }}
                  className="text-muted-foreground"
                >
                  フィルターをリセット
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result count + Export ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {sorted.length > 0 ? `${sorted.length}件の仕訳` : ''}
        </p>
        <CSVExportDialog
          title="仕訳帳"
          data={initialEntries}
          dateField="entry_date"
          onExport={(filteredData, startDate, endDate) =>
            exportJournalEntries(filteredData, accounts, startDate, endDate)
          }
        />
      </div>

      {/* ── Empty state ── */}
      {sorted.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="仕訳が見つかりません"
          description={
            hasActiveFilters || filters.search
              ? '検索条件を変更してください'
              : 'まだ仕訳が作成されていません'
          }
        />
      )}

      {/* ── Desktop table ── */}
      {sorted.length > 0 && (
        <>
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-3 pl-4 pr-2 text-xs font-semibold text-muted-foreground text-left w-24">日付</th>
                  <th className="py-3 px-2 text-xs font-semibold text-muted-foreground text-left">摘要</th>
                  <th className="py-3 px-2 text-xs font-semibold text-blue-600 text-right w-32">借方</th>
                  <th className="py-3 px-2 text-xs font-semibold text-orange-600 text-right w-32">貸方</th>
                  <th className="py-3 px-2 text-xs font-semibold text-muted-foreground text-left w-28">種別</th>
                  <th className="py-3 pl-2 pr-4 text-xs font-semibold text-muted-foreground text-left w-24">状態</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {paged.map((entry) => (
                    <DesktopRow
                      key={entry.id}
                      entry={entry}
                      onClick={() => router.push(`/journal/${entry.id}`)}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3">
            <AnimatePresence>
              {paged.map((entry) => (
                <MobileCard
                  key={entry.id}
                  entry={entry}
                  onClick={() => router.push(`/journal/${entry.id}`)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {(currentPage - 1) * PAGE_SIZE + 1}〜
                {Math.min(currentPage * PAGE_SIZE, sorted.length)} / {sorted.length}件
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === totalPages)
                  .reduce<Array<number | '...'>>((acc, p, i, arr) => {
                    if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                    ) : (
                      <Button
                        key={p}
                        type="button"
                        variant={p === currentPage ? 'default' : 'outline'}
                        size="icon-sm"
                        onClick={() => setPage(p as number)}
                        className={cn(p === currentPage && 'pointer-events-none')}
                      >
                        {p}
                      </Button>
                    )
                  )}
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
