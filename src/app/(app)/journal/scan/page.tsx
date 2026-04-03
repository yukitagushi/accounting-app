import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { getAccounts } from '@/lib/mock-data'
import { OCRScanPageClient } from './ocr-scan-page-client'

export default async function OCRScanPage() {
  const accounts = await getAccounts()

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="レシート読取り"
        description="レシート・領収書を撮影して自動仕訳"
        actions={
          <Link href="/journal">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="size-4" />
              一覧に戻る
            </Button>
          </Link>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <OCRScanPageClient accounts={accounts} />
      </div>
    </div>
  )
}
