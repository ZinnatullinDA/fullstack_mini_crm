import type { FormEvent } from 'react'
import type { TaskStatus } from '@/entities/task/model/types'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { availableTransitions, statusLabels } from '@/entities/task/model/types'
import { useAuth } from '@/features/auth/auth-provider'
import {
  deleteTask,
  getObject,
  getTask,
  listHistory,
  listProfiles,
  saveTask,
  transitionTask,
} from '@/shared/api/crm'
import { AsyncState } from '@/shared/components/async-state'
import { StatusBadge } from '@/shared/components/status-badge'
import { Button } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog'
import { useQuery } from '@/shared/hooks/use-query'

export function TaskDetailsPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const task = useQuery(() => getTask(id), `task:${id}`)
  const history = useQuery(() => listHistory(id), `history:${id}`)
  const profiles = useQuery(listProfiles, 'profiles')
  const object = useQuery(
    () =>
      task.data
        ? getObject(task.data.object_id)
        : Promise.reject(new Error('Задача не найдена')),
    `object:${task.data?.object_id}`,
  )
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [pending, setPending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reworkOpen, setReworkOpen] = useState(false)
  const [reworkComment, setReworkComment] = useState('')

  function beginEdit() {
    if (!task.data) 
      return

    setTitle(task.data.title)
    setDescription(task.data.description)
    setAssigneeId(task.data.assignee_id)
    setEditing(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!task.data || !profile) 
      return

    setPending(true)

    try {
      await saveTask(
        {
          assignee_id: assigneeId,
          description,
          object_id: task.data.object_id,
          title,
        },
        profile.id,
        task.data.id,
      )
      toast.success('Задача изменена')
      setEditing(false)
      await task.reload()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'Не удалось изменить задачу',
      )
    } finally {
      setPending(false)
    }
  }

  async function remove() {
    if (!task.data) 
      return

    try {
      await deleteTask(task.data.id)
      toast.success('Задача удалена')
      void navigate(`/objects/${task.data.object_id}`)
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'Не удалось удалить задачу',
      )
    }
  }

  async function transition(status: TaskStatus, comment?: string) {
    if (!task.data) 
      return

    if (status === 'rework' && !comment?.trim()) 
      return

    setPending(true)

    try {
      await transitionTask(task.data, status, comment)
      toast.success(`Статус: ${statusLabels[status]}`)
      setReworkOpen(false)
      setReworkComment('')
      await Promise.all([task.reload(), history.reload()])
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'Не удалось изменить статус',
      )
      await task.reload()
    } finally {
      setPending(false)
    }
  }

  const names = new Map(
    profiles.data?.map((item) => [item.id, item.display_name || item.id]),
  )

  return (
    <section className="space-y-7">
      <ConfirmDialog
        description="История статусов сохранится в базе."
        onConfirm={() => void remove()}
        onOpenChange={setDeleting}
        open={deleting}
        title={`Удалить задачу «${task.data?.title || ''}»?`}
      />
      <Link
        className="text-sm text-slate-600 hover:underline"
        to={task.data ? `/objects/${task.data.object_id}` : '/objects'}
      >
        ← К объекту
      </Link>
      <AsyncState error={task.error} loading={task.loading}>
        {task.data && (
          <article className="space-y-5 rounded-xl border bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold">{task.data.title}</h1>
                <p className="mt-2 text-slate-600">
                  {task.data.description || 'Без описания'}
                </p>
              </div>
              <StatusBadge status={task.data.status} />
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Объект</dt>
                <dd>{object.data?.name || 'Загрузка…'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Исполнитель</dt>
                <dd>
                  {names.get(task.data.assignee_id) || task.data.assignee_id}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Автор</dt>
                <dd>{names.get(task.data.author_id) || task.data.author_id}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Создана</dt>
                <dd>
                  {new Date(task.data.created_at).toLocaleString('ru-RU')}
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              {profile &&
                availableTransitions(task.data, profile).map((status) => (
                  <Button
                    disabled={pending}
                    key={status}
                    onClick={() =>
                      status === 'rework'
                        ? setReworkOpen(true)
                        : void transition(status)
                    }
                    variant={status === 'rework' ? 'outline' : 'default'}
                  >
                    {statusLabels[status]}
                  </Button>
                ))}
              {profile?.role === 'manager' && (
                <Button onClick={beginEdit} variant="outline">
                  Изменить
                </Button>
              )}
              {profile?.role === 'manager' && (
                <Button onClick={() => setDeleting(true)} variant="destructive">
                  Удалить
                </Button>
              )}
            </div>
          </article>
        )}
      </AsyncState>
      {reworkOpen && (
        <form
          className="space-y-4 rounded-xl border bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault()
            void transition('rework', reworkComment)
          }}
        >
          <h2 className="text-lg font-semibold">Вернуть на доработку</h2>
          <label className="block space-y-1">
            <span>Комментарий</span>
            <textarea
              className="w-full rounded border p-2"
              onChange={(event) => setReworkComment(event.target.value)}
              required
              value={reworkComment}
            />
          </label>
          <div className="flex gap-2">
            <Button disabled={pending} type="submit">
              Отправить
            </Button>
            <Button
              onClick={() => setReworkOpen(false)}
              type="button"
              variant="outline"
            >
              Отмена
            </Button>
          </div>
        </form>
      )}
      {editing && task.data && (
        <form
          className="space-y-4 rounded-xl border bg-white p-5"
          onSubmit={submit}
        >
          <h2 className="text-xl font-semibold">Редактировать задачу</h2>
          <label className="block space-y-1">
            <span>Название</span>
            <input
              className="w-full rounded border p-2"
              maxLength={200}
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </label>
          <label className="block space-y-1">
            <span>Описание</span>
            <textarea
              className="w-full rounded border p-2"
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              value={description}
            />
          </label>
          <label className="block space-y-1">
            <span>Исполнитель</span>
            <select
              className="w-full rounded border p-2"
              onChange={(event) => setAssigneeId(event.target.value)}
              required
              value={assigneeId}
            >
              <option value="">Выберите исполнителя</option>
              {profiles.data
                ?.filter((item) => item.role === 'executor')
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.display_name || item.id}
                  </option>
                ))}
            </select>
          </label>
          <div className="flex gap-2">
            <Button disabled={pending} type="submit">
              Сохранить
            </Button>
            <Button
              onClick={() => setEditing(false)}
              type="button"
              variant="outline"
            >
              Отмена
            </Button>
          </div>
        </form>
      )}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">История статусов</h2>
        <AsyncState
          empty={history.data?.length === 0}
          error={history.error}
          loading={history.loading}
        >
          <ol className="space-y-3">
            {history.data?.map((item) => (
              <li className="rounded-xl border bg-white p-4" key={item.id}>
                <p className="font-medium">
                  {statusLabels[item.old_status]} →{' '}
                  {statusLabels[item.new_status]}
                </p>
                <p className="text-sm text-slate-500">
                  {names.get(item.actor_id) || item.actor_id} ·{' '}
                  {new Date(item.created_at).toLocaleString('ru-RU')}
                </p>
                {item.comment && <p className="mt-2">{item.comment}</p>}
              </li>
            ))}
          </ol>
        </AsyncState>
      </section>
    </section>
  )
}
