'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AppError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center text-center px-6 max-w-md">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 mb-5">
          <AlertTriangle className="w-7 h-7 text-red-600" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-2">エラーが発生しました</h1>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          {error.message || 'ページの読み込み中にエラーが発生しました。'}
        </p>
        <Button onClick={reset} className="gap-2">
          再試行
        </Button>
      </div>
    </div>
  )
}
