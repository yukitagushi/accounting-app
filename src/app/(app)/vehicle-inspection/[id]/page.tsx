'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { InspectionForm } from '@/components/vehicle-inspection/inspection-form'
import { getVehicleInspection } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import type { VehicleInspection } from '@/lib/types'

export default function VehicleInspectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [inspection, setInspection] = useState<VehicleInspection | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    params.then(({ id }) => {
      setId(id)
      if (id === 'new') {
        setIsNew(true)
        setLoading(false)
      } else {
        getVehicleInspection(id).then((data) => {
          setInspection(data ?? null)
          setLoading(false)
        })
      }
    })
  }, [params])

  if (loading) return <div className="py-20 text-center text-gray-400">読み込み中...</div>

  if (!isNew && !inspection) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500 mb-4">車検データが見つかりません</p>
        <Link href="/vehicle-inspection"><Button variant="outline">車検一覧へ戻る</Button></Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/vehicle-inspection">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 -ml-1">
            <ChevronLeft className="w-4 h-4" />
            車検一覧へ
          </Button>
        </Link>
      </div>

      <PageHeader
        title={isNew ? '新規車検登録' : `車検詳細 - ${inspection!.customer_name}`}
        description={
          isNew
            ? '新しい車検情報を入力してください'
            : `${inspection!.vehicle_number} / 車検日: ${inspection!.inspection_date}`
        }
        actions={
          inspection?.journal_entry_id ? (
            <Link href={`/journal/${inspection.journal_entry_id}`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" />
                仕訳を見る
              </Button>
            </Link>
          ) : undefined
        }
      />

      <InspectionForm
        initialData={inspection ?? undefined}
        mode={isNew ? 'new' : 'edit'}
      />
    </div>
  )
}
