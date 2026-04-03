'use client'

import Link from 'next/link'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { getMockVehicleInspections } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { Plus, Car, Calendar, User } from 'lucide-react'
import { CSVExportDialog } from '@/components/shared/csv-export-dialog'
import { exportVehicleInspections } from '@/lib/csv-export'

function formatCurrency(val: number): string {
  return '¥' + val.toLocaleString('ja-JP')
}

function getDiffColor(diff: number): string {
  if (diff === 0) return 'text-green-600'
  if (diff < 0) return 'text-red-600'
  return 'text-blue-600'
}

function getDiffBg(diff: number): string {
  if (diff === 0) return 'bg-green-50 border-green-200'
  if (diff < 0) return 'bg-red-50 border-red-200'
  return 'bg-blue-50 border-blue-200'
}

function formatDiff(diff: number): string {
  if (diff === 0) return '±0'
  if (diff > 0) return `+${diff.toLocaleString('ja-JP')}`
  return diff.toLocaleString('ja-JP')
}

export default function VehicleInspectionListPage() {
  const inspections = getMockVehicleInspections()

  return (
    <div>
      <PageHeader
        title="車検管理"
        description="車検の預かり金と実際費用を管理します"
        actions={
          <>
            <CSVExportDialog
              title="車検一覧"
              data={inspections}
              dateField="inspection_date"
              onExport={(filteredData, startDate, endDate) =>
                exportVehicleInspections(filteredData, startDate, endDate)
              }
            />
            <Link href="/vehicle-inspection/new">
              <Button className="gap-1.5">
                <Plus className="w-4 h-4" />
                新規車検登録
              </Button>
            </Link>
          </>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: '全件', value: inspections.length, color: 'text-gray-700' },
          { label: '未処理', value: inspections.filter((i) => i.status === 'pending').length, color: 'text-yellow-600' },
          { label: '進行中', value: inspections.filter((i) => i.status === 'in_progress').length, color: 'text-blue-600' },
          { label: '完了', value: inspections.filter((i) => i.status === 'completed' || i.status === 'settled').length, color: 'text-green-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-2xl font-bold tabular-nums', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Card Grid */}
      {inspections.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">車検データがありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {inspections.map((inspection) => (
            <Link
              key={inspection.id}
              href={`/vehicle-inspection/${inspection.id}`}
              className="group block bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <p className="font-semibold text-gray-900 truncate">{inspection.customer_name}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <p className="text-sm text-gray-600 font-mono">{inspection.vehicle_number}</p>
                    </div>
                  </div>
                  <StatusBadge status={inspection.status} />
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>車検日: {inspection.inspection_date}</span>
                </div>
              </div>

              {/* Card Body - Amount Comparison */}
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">預かり合計</p>
                    <p className="font-semibold tabular-nums text-gray-900">
                      {formatCurrency(inspection.total_deposit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">実際合計</p>
                    <p className="font-semibold tabular-nums text-gray-900">
                      {inspection.total_actual > 0 ? formatCurrency(inspection.total_actual) : '—'}
                    </p>
                  </div>
                </div>

                {/* Difference Pill */}
                <div
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-semibold tabular-nums',
                    getDiffBg(inspection.difference)
                  )}
                >
                  <span className="text-xs text-gray-600 font-normal">差額</span>
                  <span className={getDiffColor(inspection.difference)}>
                    {formatDiff(inspection.difference)}
                  </span>
                </div>

                {inspection.journal_entry_id && (
                  <p className="mt-2 text-xs text-purple-600 font-medium">仕訳済み</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
