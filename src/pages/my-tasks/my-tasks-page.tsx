import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth-provider'
import { listTasks } from '@/shared/api/crm'
import { AsyncState } from '@/shared/components/async-state'
import { StatusBadge } from '@/shared/components/status-badge'
import { useQuery } from '@/shared/hooks/use-query'

export function MyTasksPage() {
  const { profile } = useAuth()
  const { data, error, loading } = useQuery(() => listTasks(undefined, profile?.id), `my-tasks:${profile?.id}`)

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Мои задачи</h1>
      <AsyncState empty={data?.length === 0} error={error} loading={loading}>
        <div className="space-y-3">
          {data?.map(task => (
            <Link className="block rounded-xl border bg-white p-5 hover:border-slate-400" key={task.id} to={`/tasks/${task.id}`}>
              <div className="flex items-center justify-between gap-3"><strong>{task.title}</strong><StatusBadge status={task.status} /></div>
            </Link>
          ))}
        </div>
      </AsyncState>
    </section>
  )
}
