import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusKey =
  | 'draft'
  | 'posted'
  | 'void'
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'accepted'
  | 'rejected'
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'settled'

const STATUS_CONFIG: Record<
  StatusKey,
  { label: string; className: string }
> = {
  draft: {
    label: '下書き',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  posted: {
    label: '承認済み',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  void: {
    label: '無効',
    className: 'bg-red-50 text-red-600 border-red-200',
  },
  sent: {
    label: '送付済み',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  paid: {
    label: '支払済み',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  overdue: {
    label: '期限超過',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  accepted: {
    label: '承認',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  rejected: {
    label: '却下',
    className: 'bg-red-50 text-red-600 border-red-200',
  },
  pending: {
    label: '未処理',
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  in_progress: {
    label: '進行中',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  completed: {
    label: '完了',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  cancelled: {
    label: 'キャンセル',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
  },
  settled: {
    label: '精算済み',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
  },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as StatusKey]

  if (!config) {
    return (
      <Badge
        variant="outline"
        className={cn('text-xs font-medium', className)}
      >
        {status}
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn('text-xs font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
