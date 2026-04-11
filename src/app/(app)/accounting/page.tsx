'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { getTrialBalanceFromVouchers } from '@/lib/supabase/database'
import type { TrialBalanceRow } from '@/lib/supabase/database'
import { ACCOUNT_CATEGORIES } from '@/lib/constants'
import type { AccountCategory } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AccountingTabs } from '@/components/shared/accounting-tabs'
import { CheckCircle, XCircle, RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportTrialBalance } from '@/lib/csv-export'
import { useBranchStore } from '@/hooks/use-branch'

const CATEGORY_ORDER: AccountCategory[] = ['assets', 'liabilities', 'equity', 'revenue', 'expense']

function formatCurrency(val: number): string {
  if (val === 0) return '—'
  return val.toLocaleString('ja-JP')
}

export default function AccountingPage() {
  const [period, setPeriod] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const { currentBranch } = useBranchStore()
  const branchId = currentBranch?.id === 'all' || !currentBranch ? undefined : currentBranch.id

  const [rows, setRows] = useState<TrialBalanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoading(true)
    getTrialBalanceFromVouchers(branchId, period)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [branchId, period, refreshKey])

  // ページがフォーカスされたら自動で再集計
  useEffect(() => {
    const handleFocus = () => setRefreshKey((k) => k + 1)
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const groupedByCategory = useMemo(() => {
    const map: Record<string, typeof rows> = {}
    for (const cat of CATEGORY_ORDER) {
      map[cat] = rows.filter((r) => r.category === cat)
    }
    return map
  }, [rows])

  const totalDebit = rows.reduce((s, r) => s + r.debit_balance, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit_balance, 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 1
  const monthlySalesTotal = (groupedByCategory.revenue ?? []).reduce((s, r) => s + r.credit_balance, 0)

  // 月の前後移動
  function shiftMonth(delta: number) {
    const [y, m] = period.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    const newY = d.getFullYear()
    const newM = String(d.getMonth() + 1).padStart(2, '0')
    setPeriod(`${newY}-${newM}`)
  }

  const [periodYear, periodMonth] = period.split('-')
  const periodLabel = `${periodYear}年${parseInt(periodMonth, 10)}月`

  return (
    <div>
      <PageHeader
        title="会計管理"
        description="試算表・勘定科目を管理します"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-1 py-0.5">
              <button
                onClick={() => shiftMonth(-1)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="前月"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="h-7 border-0 bg-transparent px-1 text-sm focus:outline-none tabular-nums"
              />
              <button
                onClick={() => shiftMonth(1)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="翌月"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
              className="gap-1.5"
              title="最新データを再集計"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              再集計
            </Button>
            <Button
              size="sm"
              onClick={() => exportTrialBalance(rows, period)}
              disabled={loading || rows.length === 0}
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
              title={`${periodLabel}の試算表をCSVで出力`}
            >
              <Download className="w-3.5 h-3.5" />
              CSV出力
            </Button>
          </div>
        }
      />

      <AccountingTabs active="trial-balance" />

      {/* 月次売上サマリー */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">{periodLabel} 売上合計</p>
          <p className="text-2xl font-bold text-green-700 tabular-nums">¥{monthlySalesTotal.toLocaleString('ja-JP')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">資産合計</p>
          <p className="text-2xl font-bold text-blue-700 tabular-nums">¥{totalDebit.toLocaleString('ja-JP')}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">売上品目数</p>
          <p className="text-2xl font-bold text-gray-700 tabular-nums">{(groupedByCategory.revenue ?? []).length}件</p>
        </div>
      </div>

      {/* Balance Check Indicator */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl border mb-4 text-sm font-medium w-fit',
          isBalanced
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        )}
      >
        {isBalanced ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <XCircle className="w-4 h-4" />
        )}
        {isBalanced ? '貸借合計バランス: 一致' : '貸借合計バランス: 不一致'}
        <span className="font-bold tabular-nums ml-1">
          借方 {totalDebit.toLocaleString('ja-JP')} / 貸方 {totalCredit.toLocaleString('ja-JP')}
        </span>
      </div>

      {/* Trial Balance Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
          データを読み込み中...
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
          {period.replace('-', '年')}月の振替伝票データがありません
        </div>
      ) : (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-[200px]">
                  勘定科目
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-600 min-w-[140px]">借方残高</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600 min-w-[140px]">貸方残高</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_ORDER.map((category) => {
                const catRows = groupedByCategory[category] ?? []
                if (catRows.length === 0) return null
                const catDebit = catRows.reduce((s, r) => s + r.debit_balance, 0)
                const catCredit = catRows.reduce((s, r) => s + r.credit_balance, 0)
                return (
                  <React.Fragment key={category}>
                    {/* Category Header */}
                    <tr className="bg-gray-50/80 border-t border-gray-200">
                      <td
                        colSpan={3}
                        className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50/80"
                      >
                        {ACCOUNT_CATEGORIES[category]}
                      </td>
                    </tr>

                    {/* Account Rows */}
                    {catRows.map((row) => (
                      <tr
                        key={row.account_id}
                        className="border-t border-gray-100 hover:bg-blue-50/30 transition-colors"
                      >
                        <td className="py-2.5 px-4 sticky left-0 bg-white hover:bg-blue-50/30">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-mono w-10 shrink-0">
                              {row.account_code}
                            </span>
                            <span className="text-gray-900">{row.account_name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-gray-700">
                          {formatCurrency(row.debit_balance)}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-gray-700">
                          {formatCurrency(row.credit_balance)}
                        </td>
                      </tr>
                    ))}

                    {/* Category Subtotal */}
                    <tr className="border-t border-gray-200 bg-gray-50">
                      <td className="py-2 px-4 sticky left-0 bg-gray-50">
                        <span className="text-xs font-semibold text-gray-600 ml-12">
                          {ACCOUNT_CATEGORIES[category]}合計
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums font-semibold text-gray-800">
                        {formatCurrency(catDebit)}
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums font-semibold text-gray-800">
                        {formatCurrency(catCredit)}
                      </td>
                    </tr>
                  </React.Fragment>
                )
              })}

              {/* Grand Total */}
              <tr className="border-t-2 border-gray-300 bg-gray-100">
                <td className="py-3 px-4 font-bold text-gray-900 sticky left-0 bg-gray-100">
                  合計
                </td>
                <td
                  className={cn(
                    'py-3 px-4 text-right tabular-nums font-bold text-base',
                    isBalanced ? 'text-gray-900' : 'text-red-600'
                  )}
                >
                  {totalDebit.toLocaleString('ja-JP')}
                </td>
                <td
                  className={cn(
                    'py-3 px-4 text-right tabular-nums font-bold text-base',
                    isBalanced ? 'text-gray-900' : 'text-red-600'
                  )}
                >
                  {totalCredit.toLocaleString('ja-JP')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  )
}
