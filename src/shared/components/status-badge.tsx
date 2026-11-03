import type { TaskStatus } from '@/entities/task/model/types'
import { statusLabels } from '@/entities/task/model/types'
import { cn } from '@/shared/lib/utils'

const colors: Record<TaskStatus, string> = {
  new: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-800',
  in_review: 'bg-amber-100 text-amber-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  rework: 'bg-rose-100 text-rose-800',
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={cn('inline-flex rounded-full px-3 py-1 text-sm font-medium', colors[status])}>{statusLabels[status]}</span>
}
