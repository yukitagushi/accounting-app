'use client'

import { useState, useMemo } from 'react'
import { Download, X, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type CSVExportDialogProps = {
  title: string
  data: any[]
  dateField: string
  onExport: (filteredData: any[], startDate: string, endDate: string) => void
  showDateFilter?: boolean
}

function getDefaultDates(): { start: string; end: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const start = `${year}-${month}-01`
  const end = `${year}-${month}-${day}`
  return { start, end }
}

function getFiscalYearRange(): { start: string; end: string } {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  // Assume fiscal year starts April 1
  const fyStartYear = month >= 4 ? year : year - 1
  return {
    start: `${fyStartYear}-04-01`,
    end: `${fyStartYear + 1}-03-31`,
  }
}

function getLastMonthRange(): { start: string; end: string } {
  const now = new Date()
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 24 * 60 * 60 * 1000)
  const firstOfLastMonth = new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1)

  function fmt(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  return { start: fmt(firstOfLastMonth), end: fmt(lastOfLastMonth) }
}

export function CSVExportDialog({
  title,
  data,
  dateField,
  onExport,
  showDateFilter = true,
}: CSVExportDialogProps) {
  const [open, setOpen] = useState(false)
  const defaults = getDefaultDates()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)

  const filteredCount = useMemo(() => {
    if (!showDateFilter) return data.length
    return data.filter((item) => {
      const date: string = item[dateField] ?? ''
      if (startDate && date < startDate) return false
      if (endDate && date > endDate) return false
      return true
    }).length
  }, [data, dateField, startDate, endDate, showDateFilter])

  const filteredData = useMemo(() => {
    if (!showDateFilter) return data
    return data.filter((item) => {
      const date: string = item[dateField] ?? ''
      if (startDate && date < startDate) return false
      if (endDate && date > endDate) return false
      return true
    })
  }, [data, dateField, startDate, endDate, showDateFilter])

  function handleExport() {
    onExport(filteredData, startDate, endDate)
    setOpen(false)
  }

  function applyPreset(preset: 'thisMonth' | 'lastMonth' | 'thisYear') {
    if (preset === 'thisMonth') {
      const d = getDefaultDates()
      setStartDate(d.start)
      setEndDate(d.end)
    } else if (preset === 'lastMonth') {
      const d = getLastMonthRange()
      setStartDate(d.start)
      setEndDate(d.end)
    } else {
      const d = getFiscalYearRange()
      setStartDate(d.start)
      setEndDate(d.end)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Download className="w-4 h-4" />
        CSVエクスポート
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50">
                  <Download className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">CSVエクスポート</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{title}</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {showDateFilter && (
                <>
                  {/* Quick presets */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-600">期間プリセット</p>
                    <div className="flex gap-1.5">
                      {[
                        { key: 'thisMonth' as const, label: '今月' },
                        { key: 'lastMonth' as const, label: '先月' },
                        { key: 'thisYear' as const, label: '今期' },
                      ].map((preset) => (
                        <button
                          key={preset.key}
                          onClick={() => applyPreset(preset.key)}
                          className="flex-1 py-1.5 px-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date range inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        開始日
                      </label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        終了日
                      </label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Count preview */}
              <div
                className={cn(
                  'flex items-center justify-between px-4 py-3 rounded-xl border',
                  filteredCount > 0
                    ? 'bg-indigo-50 border-indigo-100'
                    : 'bg-gray-50 border-gray-200'
                )}
              >
                <span className="text-sm text-gray-600">エクスポート件数</span>
                <span
                  className={cn(
                    'text-sm font-bold tabular-nums',
                    filteredCount > 0 ? 'text-indigo-700' : 'text-gray-400'
                  )}
                >
                  {filteredCount}件
                </span>
              </div>

              {filteredCount === 0 && (
                <p className="text-xs text-center text-gray-400">
                  選択した期間にデータがありません
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-5 border-t border-gray-100 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleExport}
                disabled={filteredCount === 0}
                className="flex-1 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Download className="w-4 h-4" />
                エクスポート
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
