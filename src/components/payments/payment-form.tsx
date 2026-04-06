'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  searchInvoicesByPaymentKeyword,
  createPayment,
  createJournalEntry,
  updateInvoicePaidAmount,
  getAccounts,
  createInspectionJournalEntry,
} from '@/lib/supabase/database'
import { createClient } from '@/lib/supabase/client'
import { PAYMENT_METHODS } from '@/lib/constants'
import { useBranchStore } from '@/hooks/use-branch'
import type { Invoice, Account, PaymentMethod } from '@/lib/types'
import { toast } from 'sonner'
import { Search, Banknote, CheckCircle, ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

function formatCurrency(val: number): string {
  return '¥' + val.toLocaleString('ja-JP')
}

export function PaymentForm() {
  const router = useRouter()
  const { currentBranch } = useBranchStore()
  const branchId =
    currentBranch?.id === 'all' || !currentBranch
      ? '00000000-0000-0000-0000-000000000001'
      : currentBranch.id

  const today = new Date().toISOString().slice(0, 10)

  // Smart input state
  const [keyword, setKeyword] = useState('')
  const [suggestions, setSuggestions] = useState<Invoice[]>([])
  const [searching, setSearching] = useState(false)

  // Selected invoice
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // Form fields
  const [paymentDate, setPaymentDate] = useState(today)
  const [amount, setAmount] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Accounts cache
  const [accounts, setAccounts] = useState<Account[]>([])

  useEffect(() => {
    getAccounts(branchId).then(setAccounts)
  }, [branchId])

  // Debounced search
  const doSearch = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setSuggestions([])
        return
      }
      setSearching(true)
      try {
        const results = await searchInvoicesByPaymentKeyword(text)
        setSuggestions(results)
      } finally {
        setSearching(false)
      }
    },
    []
  )

  useEffect(() => {
    if (selectedInvoice) return
    const timer = setTimeout(() => {
      doSearch(keyword)
    }, 500)
    return () => clearTimeout(timer)
  }, [keyword, selectedInvoice, doSearch])

  function handleSelectInvoice(invoice: Invoice) {
    setSelectedInvoice(invoice)
    setSuggestions([])
    const remaining = invoice.total - (invoice.paid_amount ?? 0)
    setAmount(remaining > 0 ? remaining : invoice.total)
    setDescription(keyword || `${invoice.customer_name} 入金`)
  }

  function handleClearInvoice() {
    setSelectedInvoice(null)
    setAmount('')
    setDescription('')
  }

  const remaining = selectedInvoice
    ? selectedInvoice.total - (selectedInvoice.paid_amount ?? 0)
    : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedInvoice) {
      toast.error('請求書を選択してください')
      return
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('入金金額を入力してください')
      return
    }
    if (Number(amount) > remaining) {
      toast.error(`入金金額が残高（${formatCurrency(remaining)}）を超えています`)
      return
    }

    setSubmitting(true)
    try {
      // Determine debit account: 1000 (現金) or 1010 (普通預金)
      const debitCode =
        paymentMethod === 'cash'
          ? '1000'
          : paymentMethod === 'bank_transfer'
          ? '1010'
          : paymentMethod === 'credit_card'
          ? '1010'
          : '1000'
      // Credit account: 1100 (売掛金)
      const creditCode = '1100'

      const debitAccount = accounts.find((a) => a.code === debitCode)
      const creditAccount = accounts.find((a) => a.code === creditCode)

      if (!debitAccount || !creditAccount) {
        toast.error('勘定科目が見つかりません。設定を確認してください。')
        return
      }

      const entryDescription = description || `${selectedInvoice.customer_name} 入金`
      // Create journal entry
      const journalEntry = await createJournalEntry({
        branch_id: branchId,
        entry_date: paymentDate,
        description: entryDescription,
        entry_type: 'payment',
        status: 'posted',
        lines: [
          {
            account_id: debitAccount.id,
            debit_amount: Number(amount),
            credit_amount: 0,
            description: entryDescription,
            line_order: 1,
          } as import('@/lib/types').JournalEntryLine,
          {
            account_id: creditAccount.id,
            debit_amount: 0,
            credit_amount: Number(amount),
            description: entryDescription,
            line_order: 2,
          } as import('@/lib/types').JournalEntryLine,
        ],
      })

      // Create payment record
      await createPayment({
        branch_id: branchId,
        invoice_id: selectedInvoice.id,
        payment_date: paymentDate,
        amount: Number(amount),
        payment_method: paymentMethod,
        description: entryDescription,
        journal_entry_id: journalEntry.id,
      })

      // Update invoice paid_amount and status
      await updateInvoicePaidAmount(selectedInvoice.id)

      // If invoice has a linked vehicle inspection, create inspection journal entry
      try {
        const supabase = createClient()
        const { data: inspection } = await supabase
          .from('vehicle_inspections')
          .select('id')
          .eq('invoice_id', selectedInvoice.id)
          .maybeSingle()
        if (inspection?.id) {
          await createInspectionJournalEntry({
            inspection_id: inspection.id,
            journal_entry_id: journalEntry.id,
            entry_purpose: 'payment',
          })
        }
      } catch {
        // Non-critical: ignore if inspection lookup fails
      }

      toast.success('入金を登録しました')
      router.push('/payments')
    } catch {
      toast.error('登録に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/payments">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 -ml-1">
            <ChevronLeft className="w-4 h-4" />
            入金一覧へ
          </Button>
        </Link>
      </div>

      <PageHeader title="入金登録" description="入金内容を入力して登録します" />

      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        {/* Smart input */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <Label htmlFor="keyword" className="text-sm font-semibold text-gray-700">
            入金内容を入力
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="keyword"
              placeholder="例：田中車検代入金"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value)
                if (selectedInvoice) handleClearInvoice()
              }}
              className="pl-9"
            />
          </div>
          {searching && (
            <p className="text-xs text-gray-400">検索中...</p>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && !selectedInvoice && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                {suggestions.length}件の請求書が見つかりました
              </p>
              {suggestions.map((inv) => {
                const invRemaining = inv.total - (inv.paid_amount ?? 0)
                return (
                  <Card
                    key={inv.id}
                    className="cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
                    onClick={() => handleSelectInvoice(inv)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {inv.customer_name}
                          </p>
                          <p className="text-xs font-mono text-gray-500 mt-0.5">
                            {inv.invoice_number}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-gray-500">残高</p>
                          <p className="font-bold text-sm text-blue-700 tabular-nums">
                            {formatCurrency(invRemaining)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span>請求額: {formatCurrency(inv.total)}</span>
                        <span>入金済み: {formatCurrency(inv.paid_amount ?? 0)}</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {keyword && !searching && suggestions.length === 0 && !selectedInvoice && (
            <p className="text-xs text-gray-400">
              該当する未収請求書が見つかりません
            </p>
          )}
        </div>

        {/* Selected invoice summary */}
        {selectedInvoice && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
                <p className="text-sm font-semibold text-blue-800">
                  選択中の請求書
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearInvoice}
                className="text-xs text-blue-500 hover:text-blue-700 underline"
              >
                変更
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
              <div>
                <span className="text-blue-600/70">請求番号</span>
                <p className="font-mono font-medium text-blue-900">
                  {selectedInvoice.invoice_number}
                </p>
              </div>
              <div>
                <span className="text-blue-600/70">顧客名</span>
                <p className="font-medium text-blue-900">
                  {selectedInvoice.customer_name}
                </p>
              </div>
              <div>
                <span className="text-blue-600/70">請求額</span>
                <p className="font-semibold tabular-nums text-blue-900">
                  {formatCurrency(selectedInvoice.total)}
                </p>
              </div>
              <div>
                <span className="text-blue-600/70">入金済み</span>
                <p className="font-semibold tabular-nums text-blue-900">
                  {formatCurrency(selectedInvoice.paid_amount ?? 0)}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-blue-600/70">残高</span>
                <p
                  className={cn(
                    'font-bold tabular-nums text-lg',
                    remaining > 0 ? 'text-orange-600' : 'text-emerald-600'
                  )}
                >
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment details - shown only after invoice selected */}
        {selectedInvoice && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">入金情報</h2>

            {/* Payment date */}
            <div className="space-y-1.5">
              <Label htmlFor="paymentDate">入金日</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-44"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount">入金金額</Label>
              <div className="relative w-56">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  ¥
                </span>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  max={remaining}
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  required
                  className="pl-7 tabular-nums"
                />
              </div>
              {amount !== '' && Number(amount) > remaining && (
                <p className="text-xs text-red-600">
                  残高（{formatCurrency(remaining)}）を超えています
                </p>
              )}
            </div>

            {/* Payment method */}
            <div className="space-y-1.5">
              <Label htmlFor="paymentMethod">入金方法</Label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 max-w-[200px]"
              >
                {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">摘要</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="入金内容の説明"
                className="max-w-md"
              />
            </div>
          </div>
        )}

        {/* Submit */}
        {selectedInvoice && (
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              disabled={submitting || !selectedInvoice || !amount || Number(amount) <= 0}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Banknote className="w-4 h-4" />
              {submitting ? '登録中...' : '入金を登録'}
            </Button>
            <Link href="/payments">
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
          </div>
        )}
      </form>
    </div>
  )
}
