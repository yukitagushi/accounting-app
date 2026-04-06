'use client'

import React, { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { getMockTrialBalance } from '@/lib/mock-data'
import { ACCOUNT_CATEGORIES } from '@/lib/constants'
import type { AccountCategory } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AccountingTabs } from '@/components/shared/accounting-tabs'
import { CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CSVExportDialog } from '@/components/shared/csv-export-dialog'
import { exportTrialBalance } from '@/lib/csv-export'

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

  const rows = getMockTrialBalance()

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

  return (
    <div>
      <PageHeader
        title="会計管理"
        description="試算表・勘定科目を管理します"
        actions={
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 shrink-0">期間:</label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-8 rounded-lg border border-gray-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
            <CSVExportDialog
              title="試算表"
              data={rows}
              dateField=""
              showDateFilter={false}
              onExport={() => exportTrialBalance(rows, period)}
            />
          </div>
        }
      />

      <AccountingTabs active="trial-balance" />

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
    </div>
  )
}
