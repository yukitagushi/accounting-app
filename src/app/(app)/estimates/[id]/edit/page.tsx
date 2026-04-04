'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { EstimateForm } from '@/components/estimates/estimate-form'
import { Button } from '@/components/ui/button'
import { getEstimate } from '@/lib/mock-data'
import { ChevronLeft } from 'lucide-react'
import type { Estimate } from '@/lib/types'

export default function EstimateEditPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('')
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

  if (loading) return <div className="py-20 text-center text-gray-400">読み込み中...</div>
  if (!estimate) return (
    <div className="py-20 text-center">
      <p className="text-gray-500 mb-4">見積書が見つかりません</p>
      <Link href="/estimates"><Button variant="outline">見積書一覧へ戻る</Button></Link>
    </div>
  )

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/estimates/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 -ml-1">
            <ChevronLeft className="w-4 h-4" />
            見積書詳細へ
          </Button>
        </Link>
      </div>
      <PageHeader title={`見積書 編集 - ${estimate.estimate_number}`} description={estimate.customer_name} />
      <EstimateForm initialData={estimate} mode="edit" />
    </div>
  )
}
