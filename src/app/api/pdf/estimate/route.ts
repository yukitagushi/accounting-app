import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document } from '@react-pdf/renderer'
import { EstimatePDF } from '@/lib/pdf/estimate-template'
import { MOCK_ESTIMATES } from '@/lib/mock-data'
import React from 'react'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return new NextResponse('Missing id parameter', { status: 400 })
  }

  const estimate = MOCK_ESTIMATES.find((e) => e.id === id)

  if (!estimate) {
    return new NextResponse('Estimate not found', { status: 404 })
  }

  try {
    const element = React.createElement(EstimatePDF, { estimate })
    const buffer = await renderToBuffer(element as React.ReactElement<React.ComponentProps<typeof Document>>)
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="estimate-${estimate.estimate_number}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return new NextResponse('PDF generation failed', { status: 500 })
  }
}
