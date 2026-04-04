export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { getAccounts } from '@/lib/mock-data'
import { NewJournalEntryClient } from './new-journal-entry-client'

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewJournalEntryPage({ searchParams }: Props) {
  const accounts = await getAccounts()
  const params = await searchParams

  // OCR pre-fill support
  const isOcr = params['ocr'] === '1'
  const ocrDescription = typeof params['description'] === 'string' ? params['description'] : undefined
  const ocrDate = typeof params['date'] === 'string' ? params['date'] : undefined
  const ocrLinesRaw = typeof params['lines'] === 'string' ? params['lines'] : undefined

  let ocrLines: Array<{ accountCode: string; debitAmount: number; creditAmount: number; memo: string }> | undefined
  if (ocrLinesRaw) {
    try {
      ocrLines = JSON.parse(ocrLinesRaw)
    } catch {
      // ignore parse errors
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={isOcr ? 'OCRから仕訳作成' : '新規仕訳'}
        description={isOcr ? 'レシート読取り結果をもとに仕訳を編集します' : '新しい仕訳を作成します'}
        actions={
          <div className="flex items-center gap-2">
            {isOcr && (
              <Link href="/journal/scan">
                <Button variant="outline" size="sm" className="gap-2">
                  読取りに戻る
                </Button>
              </Link>
            )}
            <Link href="/journal">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="size-4" />
                一覧に戻る
              </Button>
            </Link>
          </div>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <NewJournalEntryClient
          accounts={accounts}
          ocrDescription={ocrDescription}
          ocrDate={ocrDate}
          ocrLines={ocrLines}
        />
      </div>
    </div>
  )
}
