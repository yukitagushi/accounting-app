'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { JournalEntryForm } from '@/components/journal/journal-entry-form'
import { createJournalEntry } from '@/lib/mock-data'
import type { Account, JournalEntryLine } from '@/lib/types'
import type { JournalEntryFormData, FormLine } from '@/components/journal/journal-entry-form'

interface Props {
  accounts: Account[]
  ocrDescription?: string
  ocrDate?: string
  ocrLines?: Array<{
    accountCode: string
    debitAmount: number
    creditAmount: number
    memo: string
  }>
}

let lineCounter = 2000
function nextId() {
  return `ocr-prefill-${lineCounter++}`
}

export function NewJournalEntryClient({ accounts, ocrDescription, ocrDate, ocrLines }: Props) {
  const router = useRouter()

  // Build initialData from OCR params if present
  const initialData = useMemo(() => {
    if (!ocrLines || ocrLines.length === 0) return undefined

    const lines: FormLine[] = ocrLines.map((l) => {
      const account = accounts.find((a) => a.code === l.accountCode)
      return {
        id: nextId(),
        accountId: account?.id ?? null,
        debitAmount: l.debitAmount > 0 ? l.debitAmount : '',
        creditAmount: l.creditAmount > 0 ? l.creditAmount : '',
        memo: l.memo,
      }
    })

    return {
      entry_date: ocrDate ?? new Date().toISOString().slice(0, 10),
      description: ocrDescription ?? '',
      entry_type: 'normal' as const,
      status: 'draft' as const,
      lines,
    }
  }, [accounts, ocrDate, ocrDescription, ocrLines])

  async function handleSubmit(data: JournalEntryFormData) {
    // Convert FormLine[] → JournalEntryLine[]
    const lines: JournalEntryLine[] = data.lines
      .filter((l: FormLine) => l.accountId)
      .map((l: FormLine, i: number) => ({
        id: `new-line-${i + 1}`,
        journal_entry_id: '',
        account_id: l.accountId!,
        debit_amount: typeof l.debitAmount === 'number' ? l.debitAmount : 0,
        credit_amount: typeof l.creditAmount === 'number' ? l.creditAmount : 0,
        description: l.memo,
        line_order: i + 1,
        account: accounts.find((a) => a.id === l.accountId),
      }))

    const created = await createJournalEntry({
      entry_date: data.entry_date,
      description: data.description,
      entry_type: data.entry_type,
      status: data.status,
      lines,
    })

    if (data.status === 'posted') {
      toast.success('仕訳を承認しました')
    } else {
      toast.success('下書きとして保存しました')
    }

    router.push(`/journal/${created.id}`)
  }

  return <JournalEntryForm accounts={accounts} initialData={initialData} onSubmit={handleSubmit} />
}
