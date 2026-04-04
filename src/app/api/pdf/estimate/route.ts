import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer, Document } from '@react-pdf/renderer'
import { EstimatePDF } from '@/lib/pdf/estimate-template'
import { getEstimate } from '@/lib/supabase/database'
import { createClient } from '@/lib/supabase/server'
import React from 'react'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return new NextResponse('Missing id parameter', { status: 400 })
  }

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const estimate = await getEstimate(id)

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
