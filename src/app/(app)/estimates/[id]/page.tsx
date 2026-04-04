'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { getEstimate } from '@/lib/mock-data'
import { ChevronLeft, Pencil, FileDown, ArrowRightCircle, Download } from 'lucide-react'
import type { Estimate } from '@/lib/types'
import { toast } from 'sonner'

function formatCurrency(val: number): string {
  return '¥' + val.toLocaleString('ja-JP')
}

export default function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [id, setId] = useState<string>('')
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(({ id }) => {
      setId(id)
      getEstimate(id).then((est) => {
        setEstimate(est)
        setLoading(false)
      })
    })
  }, [params])

  if (loading) {
    return <div className="py-20 text-center text-gray-400">読み込み中...</div>
  }

  if (!estimate) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500 mb-4">見積書が見つかりません</p>
        <Link href="/estimates">
          <Button variant="outline">見積書一覧へ戻る</Button>
        </Link>
      </div>
    )
  }

  async function handleDownloadPdf() {
    try {
      const res = await fetch(`/api/pdf/estimate?id=${id}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `見積書_${estimate!.customer_name}_${estimate!.issue_date}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('PDF生成に失敗しました')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/estimates">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 -ml-1">
            <ChevronLeft className="w-4 h-4" />
            見積書一覧へ
          </Button>
        </Link>
      </div>

      <PageHeader
        title={`見積書 ${estimate.estimate_number}`}
        description={`${estimate.customer_name} / 発行: ${estimate.issue_date}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/estimates/${id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" />
                編集
              </Button>
            </Link>
            {(estimate.status === 'accepted' || estimate.status === 'sent') && (
              <Link href={`/invoices/new?from_estimate=${id}`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ArrowRightCircle className="w-3.5 h-3.5" />
                  請求書へ変換
                </Button>
              </Link>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadPdf}>
              <Download className="w-3.5 h-3.5" />
              PDFダウンロード
            </Button>
          </div>
        }
      />

      {/* Detail view */}
      <div className="space-y-5">
        {/* Header card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 mb-0.5">ステータス</p>
              <StatusBadge status={estimate.status} />
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">発行日</p>
              <p className="font-medium text-gray-900">{estimate.issue_date}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">有効期限</p>
              <p className="font-medium text-gray-900">{estimate.valid_until}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-0.5">税区分</p>
              <p className="font-medium text-gray-900">
                {estimate.tax_mode === 'exclusive' ? '税抜' : '税込'}
              </p>
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">顧客情報</h2>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-gray-900 text-base">{estimate.customer_name} 御中</p>
            {estimate.customer_address && (
              <p className="text-gray-600">{estimate.customer_address}</p>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">明細</h2>
          </div>
          {estimate.line_items && estimate.line_items.length > 0 ? (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
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
                    {estimate.line_items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-5 py-3 text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gray-700">{(item.tax_rate * 100).toFixed(0)}%</td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold text-gray-900">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {estimate.line_items.map((item) => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm text-gray-900 font-medium">{item.description}</p>
                      <p className="text-sm font-bold tabular-nums text-gray-900 shrink-0">{formatCurrency(item.amount)}</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {item.quantity} x {formatCurrency(item.unit_price)} / {(item.tax_rate * 100).toFixed(0)}%
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="px-5 py-4 text-sm text-gray-400">明細なし</p>
          )}

          {/* Totals */}
          <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">小計</span>
                <span className="tabular-nums font-medium">{formatCurrency(estimate.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">消費税</span>
                <span className="tabular-nums font-medium">{formatCurrency(estimate.tax_amount)}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 mt-1">
                <span className="font-bold text-base text-gray-900">合計</span>
                <span className="tabular-nums font-bold text-xl text-gray-900">{formatCurrency(estimate.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {estimate.notes && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">備考</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{estimate.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
