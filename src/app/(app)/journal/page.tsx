export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { getJournalEntries, getAccounts } from '@/lib/mock-data'
import { JournalList } from './journal-list'

export default async function JournalPage() {
  const [entries, accounts] = await Promise.all([
    getJournalEntries(),
    getAccounts(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="仕訳管理"
        description="仕訳の作成・確認・承認を行います"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/journal/scan">
              <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                <Camera className="size-4" />
                レシート読取り
              </Button>
            </Link>
            <Link href="/journal/new">
              <Button className="gap-2 bg-primary text-primary-foreground shadow-sm shadow-primary/20">
                <Plus className="size-4" />
                新規仕訳
              </Button>
            </Link>
          </div>
        }
      />

      <JournalList initialEntries={entries} accounts={accounts} />
    </div>
  )
}
