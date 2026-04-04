export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { getJournalEntry, getAccounts } from '@/lib/mock-data'
import { JournalDetailClient } from './journal-detail-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function JournalDetailPage({ params }: PageProps) {
  const { id } = await params
  const [entry, accounts] = await Promise.all([
    getJournalEntry(id),
    getAccounts(),
  ])

  if (!entry) {
    notFound()
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="仕訳詳細"
        description={entry.description}
        actions={
          <Link href="/journal">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="size-4" />
              一覧に戻る
            </Button>
          </Link>
        }
      />

      <JournalDetailClient entry={entry} accounts={accounts} />
    </div>
  )
}
