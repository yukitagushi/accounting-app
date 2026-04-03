import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { InvoiceForm } from '@/components/invoices/invoice-form'
import { Button } from '@/components/ui/button'
import { getInvoice } from '@/lib/mock-data'
import { ChevronLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function InvoiceEditPage({ params }: PageProps) {
  const { id } = await params
  const invoice = await getInvoice(id)

  if (!invoice) {
    notFound()
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/invoices/${id}`}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-600 -ml-1">
            <ChevronLeft className="w-4 h-4" />
            請求書詳細へ
          </Button>
        </Link>
      </div>

      <PageHeader
        title={`請求書 編集 - ${invoice.invoice_number}`}
        description={invoice.customer_name}
      />

      <InvoiceForm initialData={invoice} mode="edit" />
    </div>
  )
}
