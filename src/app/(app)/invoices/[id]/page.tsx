'use client'

import { useState, useEffect } from 'react'
import { notFound, useRouter } from 'next/navigation'
import Link from 'next/link'
import { use } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getInvoice, updateInvoice } from '@/lib/mock-data'
import type { Invoice } from '@/lib/types'
import {
  ChevronLeft, Pencil, FileDown, Printer, CheckCircle, XCircle, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ExcelExportButton } from '@/components/shared/excel-export-button'
import { exportInvoiceToExcel } from '@/lib/excel-export'

interface PageProps {
  params: Promise<{ id: string }>
}

function formatCurrency(val: number): string {
  return '¥' + val.toLocaleString('ja-JP')
}

export default function InvoiceDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined)
  const [paymentDate, setPaymentDate] = useState('')
  const [showPaymentInput, setShowPaymentInput] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getInvoice(id).then(setInvoice)
  }, [id])

  if (invoice === undefined) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        読み込み中...
      </div>
    )
  }

  if (invoice === null) {
    notFound()
  }

  async function handleMarkPaid() {
    if (!paymentDate) {
      toast.error('支払日を入力してください')
      return
    }
    setSaving(true)
    try {
      const updated = await updateInvoice(id, { status: 'paid', payment_date: paymentDate })
      if (updated) {
        setInvoice(updated)
        setShowPaymentInput(false)
        toast.success('支払済みにしました')
      }
    } catch {
      toast.error('更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleVoid() {
    if (!confirm('この請求書を無効にしますか？')) return
    setSaving(true)
    try {
      const updated = await updateInvoice(id, { status: 'void' })
      if (updated) {
        setInvoice(updated)
        toast.success('請求書を無効にしました')
      }
    } catch {
      toast.error('更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/invoices">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 -ml-1">
            <ChevronLeft className="w-4 h-4" />
            請求書一覧へ
          </Button>
        </Link>
      </div>

      <PageHeader
        title={`請求書 ${invoice.invoice_number}`}
        description={`${invoice.customer_name} / 発行: ${invoice.issue_date}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {invoice.status !== 'void' && (
              <>
                <Link href={`/invoices/${id}/edit`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="w-3.5 h-3.5" />
                    編集
                  </Button>
                </Link>
                {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    onClick={() => setShowPaymentInput(true)}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    支払済みにする
                  </Button>
                )}
                {(invoice.status === 'draft' || invoice.status === 'sent') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
                  onClick={handleVoid}
                  disabled={saving}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  無効にする
                </Button>
                )}
              </>
            )}
            <a
              href={`/api/pdf/invoice?id=${id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileDown className="w-3.5 h-3.5" />
                PDF出力
              </Button>
            </a>
            {invoice && (
              <ExcelExportButton exportFn={() => exportInvoiceToExcel(invoice)} />
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="w-3.5 h-3.5" />
              印刷
            </Button>
          </div>
        }
      />

      {/* Overdue alert */}
      {invoice.status === 'overdue' && (
        <div className="mb-5 flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>この請求書は支払期限（{invoice.due_date}）を超過しています</span>
        </div>
      )}

      {/* Payment input */}
      {showPaymentInput && (
        <div className="mb-5 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-emerald-800 mb-3">支払済み処理</p>
          <div className="flex items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="paymentDate" className="text-emerald-700">支払日</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-8 w-44"
              />
            </div>
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleMarkPaid}
              disabled={saving}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              確定
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPaymentInput(false)}
            >
              キャンセル
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Status & dates */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-0.5">ステータス</p>
              <StatusBadge status={invoice.status} />
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">発行日</p>
              <p className="font-medium text-gray-900">{invoice.issue_date}</p>
            </div>
            <div>
              <p className={cn('mb-0.5', invoice.status === 'overdue' ? 'text-red-500' : 'text-gray-500')}>
                支払期限
              </p>
              <p className={cn(
                'font-medium',
                invoice.status === 'overdue' ? 'text-red-600 font-semibold' : 'text-gray-900'
              )}>
                {invoice.due_date}
              </p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">
                {invoice.payment_date ? '支払日' : '税区分'}
              </p>
              <p className="font-medium text-gray-900">
                {invoice.payment_date ?? (invoice.tax_mode === 'exclusive' ? '税抜' : '税込')}
              </p>
            </div>
          </div>
          {invoice.estimate_id && (
            <div className="mt-3 pt-3 border-t border-gray-100 text-sm">
              <span className="text-gray-500">見積書参照: </span>
              <Link href={`/estimates/${invoice.estimate_id}`} className="text-blue-600 hover:underline">
                {invoice.estimate_id}
              </Link>
            </div>
          )}
        </div>

        {/* Customer */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">顧客情報</h2>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-gray-900 text-base">{invoice.customer_name} 御中</p>
            {invoice.customer_address && (
              <p className="text-gray-600">{invoice.customer_address}</p>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">明細</h2>
          </div>
          {invoice.line_items && invoice.line_items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-gray-600">品名・作業内容</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">数量</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">単価</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">税率</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-600">金額</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.line_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3 text-gray-900">{item.description}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                        {(item.tax_rate * 100).toFixed(0)}%
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-4 text-sm text-gray-400">明細なし</p>
          )}

          {/* Totals */}
          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col items-end gap-1.5 text-sm">
              <div className="flex items-center gap-8">
                <span className="text-gray-600">小計</span>
                <span className="tabular-nums w-32 text-right">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex items-center gap-8">
                <span className="text-gray-600">消費税</span>
                <span className="tabular-nums w-32 text-right">{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="flex items-center gap-8 pt-2 border-t border-gray-200 mt-1">
                <span className="font-bold text-base text-gray-900">ご請求金額</span>
                <span className="tabular-nums w-32 text-right font-bold text-xl text-gray-900">
                  {formatCurrency(invoice.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">備考</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {/* PDF Preview */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">PDFプレビュー</h2>
            <a
              href={`/api/pdf/invoice?id=${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline"
            >
              別タブで開く
            </a>
          </div>
          <iframe
            src={`/api/pdf/invoice?id=${id}`}
            className="w-full h-[600px] rounded-lg border border-gray-200"
            title="請求書PDF"
          />
        </div>
      </div>
    </div>
  )
}
