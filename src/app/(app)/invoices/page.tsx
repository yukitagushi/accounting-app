'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getInvoices } from '@/lib/mock-data'
import type { Invoice, InvoiceStatus } from '@/lib/types'
import { Plus, Receipt, Search, Calendar, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CSVExportDialog } from '@/components/shared/csv-export-dialog'
import { exportInvoices } from '@/lib/csv-export'

function formatCurrency(val: number): string {
  return '¥' + val.toLocaleString('ja-JP')
}

const STATUS_OPTIONS: { value: InvoiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'draft', label: '下書き' },
  { value: 'sent', label: '送付済み' },
  { value: 'paid', label: '支払済み' },
  { value: 'overdue', label: '期限超過' },
  { value: 'void', label: '無効' },
]

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    getInvoices().then(setInvoices)
  }, [])

  const filtered = invoices.filter((inv) => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false
    if (search && !inv.customer_name.includes(search) && !inv.invoice_number.includes(search)) return false
    if (dateFrom && inv.issue_date < dateFrom) return false
    if (dateTo && inv.issue_date > dateTo) return false
    return true
  })

  const totalAmount = invoices.reduce((sum, i) => sum + i.total, 0)
  const unpaidAmount = invoices
    .filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.total, 0)
  const overdueCount = invoices.filter((i) => i.status === 'overdue').length
  const overdueAmount = invoices.filter((i) => i.status === 'overdue').reduce((sum, i) => sum + i.total, 0)

  return (
    <div>
      <PageHeader
        title="請求書"
        description="請求書の発行・管理を行います"
        actions={
          <>
            <CSVExportDialog
              title="請求書一覧"
              data={invoices}
              dateField="issue_date"
              onExport={(filteredData, startDate, endDate) =>
                exportInvoices(filteredData, startDate, endDate)
              }
            />
            <Link href="/invoices/new">
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
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">全件</p>
          <p className="text-xl font-bold text-gray-700 tabular-nums">{invoices.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">未収合計</p>
          <p className="text-xl font-bold text-orange-600 tabular-nums truncate">{formatCurrency(unpaidAmount)}</p>
        </div>
        <div className={cn(
          'rounded-xl border px-4 py-3',
          overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
        )}>
          <p className={cn('text-xs mb-1', overdueCount > 0 ? 'text-red-500' : 'text-gray-500')}>
            期限超過
          </p>
          <p className={cn('text-xl font-bold tabular-nums', overdueCount > 0 ? 'text-red-600' : 'text-gray-400')}>
            {overdueCount}件
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">請求総額</p>
          <p className="text-xl font-bold text-blue-700 tabular-nums truncate">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="mb-4 flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            <strong>{overdueCount}件</strong>の請求書が支払期限を超過しています（合計: {formatCurrency(overdueAmount)}）
          </span>
        </div>
      )}

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
              placeholder="顧客名・請求番号で検索"
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
        </div>
      </div>

      {/* Table / Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">請求書がありません</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">請求番号</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">顧客名</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">発行日</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">支払期限</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">金額</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={cn(
                      'cursor-pointer transition-colors',
                      invoice.status === 'overdue'
                        ? 'bg-red-50/50 hover:bg-red-50'
                        : 'hover:bg-gray-50'
                    )}
                    onClick={() => window.location.href = `/invoices/${invoice.id}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-gray-700">{invoice.invoice_number}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{invoice.customer_name}</td>
                    <td className="px-4 py-3 text-gray-600">{invoice.issue_date}</td>
                    <td className={cn(
                      'px-4 py-3',
                      invoice.status === 'overdue' ? 'text-red-600 font-semibold' : 'text-gray-600'
                    )}>
                      {invoice.due_date}
                      {invoice.status === 'overdue' && (
                        <AlertCircle className="inline ml-1.5 w-3.5 h-3.5 text-red-500" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {formatCurrency(invoice.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden grid gap-3">
            {filtered.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className={cn(
                  'block rounded-xl border hover:shadow-md transition-all duration-200 p-4',
                  invoice.status === 'overdue'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-gray-200 hover:border-blue-300'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{invoice.customer_name}</p>
                    <p className="text-xs font-mono text-gray-500 mt-0.5">{invoice.invoice_number}</p>
                  </div>
                  <StatusBadge status={invoice.status} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {invoice.issue_date}
                    </span>
                    <span className={cn(
                      'flex items-center gap-1',
                      invoice.status === 'overdue' ? 'text-red-600 font-semibold' : ''
                    )}>
                      期限: {invoice.due_date}
                    </span>
                  </div>
                  <span className="font-bold tabular-nums text-gray-900">
                    {formatCurrency(invoice.total)}
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
