'use client'

import { useState, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { InvoiceCopySearch } from '@/components/invoices/invoice-copy-search'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import type { Invoice, TaxMode } from '@/lib/types'

interface DefaultValues {
  customerName: string
  customerAddress: string
  taxMode: TaxMode
  notes: string
  lineItems: Array<{
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
    amount: number
  }>
}

export default function NewInvoicePage() {
  const [defaultValues, setDefaultValues] = useState<DefaultValues | undefined>(undefined)
  const [copyKey, setCopyKey] = useState(0)

  const handleCopy = useCallback((invoice: Invoice) => {
    setDefaultValues({
      customerName: invoice.customer_name,
      customerAddress: invoice.customer_address,
      taxMode: invoice.tax_mode,
      notes: invoice.notes,
      lineItems:
        invoice.line_items?.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate,
          amount: l.amount,
        })) ?? [],
    })
    setCopyKey((k) => k + 1)
  }, [])

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/invoices">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 -ml-1">
            <ChevronLeft className="w-4 h-4" />
            請求書一覧へ
          </Button>
        </Link>
      </div>

      <PageHeader
        title="請求書 新規作成"
        description="新しい請求書を作成します"
      />

      <InvoiceCopySearch onCopy={handleCopy} />

      <Suspense fallback={<div className="text-sm text-gray-400 py-4">読み込み中...</div>}>
        <InvoiceForm key={copyKey} mode="new" defaultValues={defaultValues} />
      </Suspense>
    </div>
  )
}
