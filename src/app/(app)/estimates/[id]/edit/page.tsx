import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { EstimateForm } from '@/components/estimates/estimate-form'
import { Button } from '@/components/ui/button'
import { getEstimate } from '@/lib/mock-data'
import { ChevronLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EstimateEditPage({ params }: PageProps) {
  const { id } = await params
  const estimate = await getEstimate(id)

  if (!estimate) {
    notFound()
  }

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

      <PageHeader
        title={`見積書 編集 - ${estimate.estimate_number}`}
        description={estimate.customer_name}
      />

      <EstimateForm initialData={estimate} mode="edit" />
    </div>
  )
}
