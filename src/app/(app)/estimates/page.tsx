'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getEstimates } from '@/lib/mock-data'
import type { Estimate, EstimateStatus } from '@/lib/types'
import { Plus, FileText, Search, Calendar, User, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CSVExportDialog } from '@/components/shared/csv-export-dialog'
import { exportEstimates } from '@/lib/csv-export'

function formatCurrency(val: number): string {
  return '¥' + val.toLocaleString('ja-JP')
}

const STATUS_OPTIONS: { value: EstimateStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'draft', label: '下書き' },
  { value: 'sent', label: '送付済み' },
  { value: 'accepted', label: '承認' },
  { value: 'rejected', label: '却下' },
]

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  useEffect(() => {
    getEstimates().then(setEstimates)
  }, [])

  const filtered = estimates.filter((e) => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false
    if (search && !e.customer_name.includes(search) && !e.estimate_number.includes(search)) return false
    if (dateFrom && e.issue_date < dateFrom) return false
    if (dateTo && e.issue_date > dateTo) return false
    return true
  }).sort((a, b) => sortOrder === 'newest' ? b.issue_date.localeCompare(a.issue_date) : a.issue_date.localeCompare(b.issue_date))

  const totalAmount = estimates.reduce((sum, e) => sum + e.total, 0)
  const draftCount = estimates.filter((e) => e.status === 'draft').length
  const acceptedCount = estimates.filter((e) => e.status === 'accepted').length

  return (
    <div>
      <PageHeader
        title="見積書"
        description="見積書の作成・管理を行います"
        actions={
          <>
            <CSVExportDialog
              title="見積書一覧"
              data={estimates}
              dateField="issue_date"
              onExport={(filteredData, startDate, endDate) =>
                exportEstimates(filteredData, startDate, endDate)
              }
            />
            <Link href="/estimates/new">
              <Button className="gap-1.5">
                <Plus className="w-4 h-4" />
                新規作成
              </Button>
            </Link>
          </>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: '全件', value: estimates.length, sub: null, color: 'text-gray-700' },
          { label: '下書き', value: draftCount, sub: null, color: 'text-gray-500' },
          { label: '承認済み', value: acceptedCount, sub: null, color: 'text-green-600' },
          { label: '合計金額', value: formatCurrency(totalAmount), sub: null, color: 'text-blue-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-xl font-bold tabular-nums truncate', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          {/* Status tabs */}
          <div className="flex gap-1 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium border transition-colors',
                  statusFilter === opt.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="顧客名・見積番号で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-sm w-36"
            />
            <span className="text-gray-400">〜</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-sm w-36"
            />
          </div>

          {/* Sort */}
          <button
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortOrder === 'newest' ? '新しい順' : '古い順'}
          </button>
        </div>
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">見積書がありません</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">見積番号</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">顧客名</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">発行日</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">有効期限</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">金額</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((estimate) => (
                  <tr
                    key={estimate.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => window.location.href = `/estimates/${estimate.id}`}
                  >
                    <td className="px-4 py-3 font-mono text-gray-700">{estimate.estimate_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{estimate.customer_name}</td>
                    <td className="px-4 py-3 text-gray-600">{estimate.issue_date}</td>
                    <td className="px-4 py-3 text-gray-600">{estimate.valid_until}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {formatCurrency(estimate.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={estimate.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden grid gap-3">
            {filtered.map((estimate) => (
              <Link
                key={estimate.id}
                href={`/estimates/${estimate.id}`}
                className="block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{estimate.customer_name}</p>
                    <p className="text-xs font-mono text-gray-500 mt-0.5">{estimate.estimate_number}</p>
                  </div>
                  <StatusBadge status={estimate.status} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {estimate.issue_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      期限: {estimate.valid_until}
                    </span>
                  </div>
                  <span className="font-bold tabular-nums text-gray-900">
                    {formatCurrency(estimate.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
