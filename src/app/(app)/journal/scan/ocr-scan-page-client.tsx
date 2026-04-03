'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { OCRScanner } from '@/components/journal/ocr-scanner'
import { createJournalEntry } from '@/lib/mock-data'
import type { Account, JournalEntryLine } from '@/lib/types'
import type { OCRResult } from '@/lib/ocr-engine'

interface Props {
  accounts: Account[]
}

export function OCRScanPageClient({ accounts }: Props) {
  const router = useRouter()

  async function handleCreateEntry(entry: OCRResult['suggestedJournalEntry']) {
    // Map OCR lines to JournalEntryLine, resolving account IDs from code
    const lines: JournalEntryLine[] = entry.lines.map((line, i) => {
      const account = accounts.find((a) => a.code === line.accountCode)
      return {
        id: `ocr-line-${i + 1}`,
        journal_entry_id: '',
        account_id: account?.id ?? '',
        debit_amount: line.debitAmount,
        credit_amount: line.creditAmount,
        description: line.accountName,
        line_order: i + 1,
        account,
      }
    })

    const created = await createJournalEntry({
      entry_date: new Date().toISOString().slice(0, 10),
      description: entry.description,
      entry_type: entry.entryType,
      status: 'draft',
      lines,
    })

    toast.success('仕訳の下書きを作成しました')
    router.push(`/journal/${created.id}`)
  }

  function handleEditEntry(
    entry: OCRResult['suggestedJournalEntry'],
    data: OCRResult['data']
  ) {
    // Encode OCR data as URL search params to pre-fill the new journal entry form
    const params = new URLSearchParams()
    params.set('ocr', '1')
    params.set('description', entry.description)
    params.set('date', data.date)
    params.set(
      'lines',
      JSON.stringify(
        entry.lines.map((line) => ({
          accountCode: line.accountCode,
          debitAmount: line.debitAmount,
          creditAmount: line.creditAmount,
          memo: line.accountName,
        }))
      )
    )
    router.push(`/journal/new?${params.toString()}`)
  }

  return (
    <OCRScanner
      onCreateEntry={handleCreateEntry}
      onEditEntry={handleEditEntry}
    />
  )
}
