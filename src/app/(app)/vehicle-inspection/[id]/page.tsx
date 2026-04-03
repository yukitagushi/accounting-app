import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { InspectionForm } from '@/components/vehicle-inspection/inspection-form'
import { getMockVehicleInspectionById } from '@/lib/mock-data'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ExternalLink } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VehicleInspectionDetailPage({ params }: PageProps) {
  const { id } = await params

  const isNew = id === 'new'
  const inspection = isNew ? undefined : getMockVehicleInspectionById(id)

  if (!isNew && !inspection) {
    notFound()
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
        initialData={inspection}
        mode={isNew ? 'new' : 'edit'}
      />
    </div>
  )
}
