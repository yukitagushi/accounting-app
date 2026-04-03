import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document } from '@react-pdf/renderer'
import { InvoicePDF } from '@/lib/pdf/invoice-template'
import { MOCK_INVOICES } from '@/lib/mock-data'
import React from 'react'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return new NextResponse('Missing id parameter', { status: 400 })
  }

  const invoice = MOCK_INVOICES.find((i) => i.id === id)

  if (!invoice) {
    return new NextResponse('Invoice not found', { status: 404 })
  }

  try {
    const element = React.createElement(InvoicePDF, { invoice })
    const buffer = await renderToBuffer(element as React.ReactElement<React.ComponentProps<typeof Document>>)
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoice_number}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return new NextResponse('PDF generation failed', { status: 500 })
  }
}
