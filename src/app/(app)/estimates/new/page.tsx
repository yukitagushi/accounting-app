import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { EstimateForm } from '@/components/estimates/estimate-form'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default function NewEstimatePage() {
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
        title="見積書 新規作成"
        description="新しい見積書を作成します"
      />

      <EstimateForm mode="new" />
    </div>
  )
}
