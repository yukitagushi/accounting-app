'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ExcelExportButtonProps {
  exportFn: () => Promise<void>
  label?: string
}

export function ExcelExportButton({ exportFn, label = 'Excel出力' }: ExcelExportButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      await exportFn()
      toast.success('Excelファイルをダウンロードしました')
    } catch (err) {
      console.error('Excel export failed:', err)
      toast.error('Excel出力に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
      {label}
    </Button>
  )
}
