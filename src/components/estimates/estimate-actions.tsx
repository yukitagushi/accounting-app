'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { ExcelExportButton } from '@/components/shared/excel-export-button'
import { exportEstimateToExcel } from '@/lib/excel-export'
import type { Estimate } from '@/lib/types'

interface EstimateActionsProps {
  estimate: Estimate
}

export function EstimatePrintButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => window.print()}
    >
      <Printer className="w-3.5 h-3.5" />
      印刷
    </Button>
  )
}

export function EstimateExcelButton({ estimate }: EstimateActionsProps) {
  return (
    <ExcelExportButton exportFn={() => exportEstimateToExcel(estimate)} />
  )
}
