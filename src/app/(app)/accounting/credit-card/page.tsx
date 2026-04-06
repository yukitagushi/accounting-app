'use client'

import { useState, useMemo, useEffect } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/shared/currency-input'
import { getCreditCardTransactions } from '@/lib/mock-data'
import type { CreditCardTransaction } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  Plus,
  X,
  CreditCard,
  TrendingDown,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { CSVExportDialog } from '@/components/shared/csv-export-dialog'
import { exportCreditCardTransactions } from '@/lib/csv-export'
import { useBranchStore } from '@/hooks/use-branch'
import { AccountingTabs } from '@/components/shared/accounting-tabs'

function formatCurrency(val: number): string {
  return '¥' + val.toLocaleString('ja-JP')
}

const DEFAULT_FEE_RATE = 0.032

export default function CreditCardPage() {
  const [transactions, setTransactions] = useState<CreditCardTransaction[]>([])
  const { currentBranch } = useBranchStore()
  const branchId = currentBranch?.id === 'all' || !currentBranch ? undefined : currentBranch.id

  useEffect(() => {
    getCreditCardTransactions(branchId).then(setTransactions).catch(() => {})
  }, [branchId])
  const [dialogOpen, setDialogOpen] = useState(false)

  // New transaction form state
  const [form, setForm] = useState({
    customerName: '',
    transactionDate: new Date().toISOString().split('T')[0],
    grossAmount: 0 as number | '',
    feeRate: DEFAULT_FEE_RATE,
  })

  const feeAmount = useMemo(() => {
    const gross = form.grossAmount === '' ? 0 : form.grossAmount
    return Math.round(gross * form.feeRate)
  }, [form.grossAmount, form.feeRate])

  const netAmount = useMemo(() => {
    const gross = form.grossAmount === '' ? 0 : form.grossAmount
    return gross - feeAmount
  }, [form.grossAmount, feeAmount])

  // Summary calculations
  const thisMonth = useMemo(() => {
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return transactions.filter((t) => t.transaction_date.startsWith(ym))
  }, [transactions])

  const totalGross = thisMonth.reduce((s, t) => s + t.gross_amount, 0)
  const totalFees = thisMonth.reduce((s, t) => s + t.fee_amount, 0)
  const totalNet = thisMonth.reduce((s, t) => s + t.net_amount, 0)
  const unsettledCount = transactions.filter((t) => t.status === 'pending').length

  function handleSubmit() {
    if (!form.customerName.trim() || form.grossAmount === '' || form.grossAmount === 0) return
    const newTx: CreditCardTransaction = {
      id: `cc-${Date.now()}`,
      branch_id: 'branch-1',
      transaction_date: form.transactionDate,
      customer_name: form.customerName,
      gross_amount: form.grossAmount as number,
      fee_rate: form.feeRate,
      fee_amount: feeAmount,
      net_amount: netAmount,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    setTransactions((prev) => [newTx, ...prev])
    setDialogOpen(false)
    setForm({
      customerName: '',
      transactionDate: new Date().toISOString().split('T')[0],
      grossAmount: 0,
      feeRate: DEFAULT_FEE_RATE,
    })
  }

  return (
    <div>
      <PageHeader
        title="クレジットカード決済管理"
        description="クレジットカード決済の手数料と売上を管理します"
        actions={
          <>
            <CSVExportDialog
              title="クレカ決済一覧"
              data={transactions}
              dateField="transaction_date"
              onExport={(filteredData, startDate, endDate) =>
                exportCreditCardTransactions(filteredData, startDate, endDate)
              }
            />
            <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              新規登録
            </Button>
          </>
        }
      />

      <AccountingTabs active="credit-card" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-gray-500">今月の決済額</p>
          </div>
          <p className="text-xl font-bold tabular-nums text-gray-900">{formatCurrency(totalGross)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <p className="text-xs text-gray-500">手数料合計</p>
          </div>
          <p className="text-xl font-bold tabular-nums text-red-600">{formatCurrency(totalFees)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-500">純売上</p>
          </div>
          <p className="text-xl font-bold tabular-nums text-green-600">{formatCurrency(totalNet)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <p className="text-xs text-gray-500">未精算件数</p>
          </div>
          <p className="text-xl font-bold tabular-nums text-yellow-600">{unsettledCount}件</p>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">日付</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">顧客名</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">決済金額</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">手数料率</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">手数料額</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">売上金額</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-4 text-gray-600 tabular-nums">{tx.transaction_date}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">{tx.customer_name}</td>
                  <td className="py-3 px-4 text-right tabular-nums font-medium text-gray-900">
                    {formatCurrency(tx.gross_amount)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-gray-600">
                    {(tx.fee_rate * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-red-600 font-medium">
                    -{formatCurrency(tx.fee_amount)}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-green-600 font-bold">
                    {formatCurrency(tx.net_amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={tx.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {transactions.map((tx) => (
          <div key={tx.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{tx.customer_name}</p>
                <p className="text-xs text-gray-500">{tx.transaction_date}</p>
              </div>
              <StatusBadge status={tx.status} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-xs text-gray-500 mb-0.5">決済額</p>
                <p className="text-sm font-bold tabular-nums text-gray-900">{formatCurrency(tx.gross_amount)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2">
                <p className="text-xs text-red-500 mb-0.5">手数料</p>
                <p className="text-sm font-bold tabular-nums text-red-600">-{formatCurrency(tx.fee_amount)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <p className="text-xs text-green-600 mb-0.5">純売上</p>
                <p className="text-sm font-bold tabular-nums text-green-600">{formatCurrency(tx.net_amount)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New Transaction Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDialogOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">新規クレジット決済登録</h2>
              <button
                onClick={() => setDialogOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="dlg-customer">顧客名</Label>
                <Input
                  id="dlg-customer"
                  value={form.customerName}
                  onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                  placeholder="田中 太郎"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dlg-date">決済日</Label>
                <Input
                  id="dlg-date"
                  type="date"
                  value={form.transactionDate}
                  onChange={(e) => setForm((p) => ({ ...p, transactionDate: e.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dlg-gross">決済金額</Label>
                <CurrencyInput
                  value={form.grossAmount}
                  onChange={(v) => setForm((p) => ({ ...p, grossAmount: v }))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dlg-fee-rate">手数料率 (%)</Label>
                <Input
                  id="dlg-fee-rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={(form.feeRate * 100).toFixed(1)}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, feeRate: parseFloat(e.target.value) / 100 || 0 }))
                  }
                />
              </div>

              {/* Auto-calculated preview */}
              {(form.grossAmount !== '' && form.grossAmount !== 0) && (
                <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">手数料が引かれました</span>
                    <span className="font-semibold text-red-600 tabular-nums">
                      -{formatCurrency(feeAmount)}
                    </span>
                  </div>
                  <div className="h-px bg-gray-200" />
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">売上はこのぐらいです</span>
                    <span className="font-bold text-green-600 tabular-nums text-base">
                      {formatCurrency(netAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="flex gap-2 p-5 border-t border-gray-100 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!form.customerName.trim() || !form.grossAmount}
                className="flex-1"
              >
                登録する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
