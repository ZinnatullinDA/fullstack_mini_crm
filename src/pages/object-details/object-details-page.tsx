import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth-provider'
import { getObject, listProfiles, listTasks, saveTask } from '@/shared/api/crm'
import { AsyncState } from '@/shared/components/async-state'
import { StatusBadge } from '@/shared/components/status-badge'
import { Button } from '@/shared/components/ui/button'
import { useQuery } from '@/shared/hooks/use-query'

export function ObjectDetailsPage() {
  const { id = '' } = useParams()
  const { profile } = useAuth()
  const object = useQuery(() => getObject(id), `object:${id}`)
  const tasks = useQuery(() => listTasks(id), `tasks:${id}`)
  const profiles = useQuery(listProfiles, 'profiles')
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile)
      return

    setPending(true)

    try {
      await saveTask({
assignee_id: assigneeId,
description,
object_id: id,
title
}, profile.id)
      toast.success('Задача создана')
      setCreating(false)
      setTitle('')
      setDescription('')
      setAssigneeId('')
      await tasks.reload()
    }
    catch (cause) {
      toast.error(cause instanceof Error
? cause.message
: 'Не удалось создать задачу')
    }
    finally {
      setPending(false)
    }
  }

  return (
    <section className="space-y-7">
      <Link className="text-sm text-slate-600 hover:underline" to="/objects">← Все объекты</Link>
      <AsyncState error={object.error} loading={object.loading}>
        <div>
          <h1 className="text-3xl font-bold">{object.data?.name}</h1>
          <p className="mt-1 text-slate-600">{object.data?.address}</p>
        </div>
      </AsyncState>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Задачи</h2>
        {profile?.role === 'manager' && <Button onClick={() => setCreating(true)}>Добавить задачу</Button>}
      </div>
      {creating && (
        <form className="space-y-4 rounded-xl border bg-white p-5" onSubmit={submit}>
          <label className="block space-y-1"><span>Название</span><input className="w-full rounded border p-2" maxLength={200} onChange={event => setTitle(event.target.value)} required value={title} /></label>
          <label className="block space-y-1"><span>Описание</span><textarea className="w-full rounded border p-2" onChange={event => setDescription(event.target.value)} rows={4} value={description} /></label>
          <label className="block space-y-1">
            <span>Исполнитель</span>
            <select className="w-full rounded border p-2" onChange={event => setAssigneeId(event.target.value)} required value={assigneeId}>
              <option value="">Выберите исполнителя</option>
              {profiles.data?.filter(item => item.role === 'executor').map(item => <option key={item.id} value={item.id}>{item.display_name || item.id}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <Button disabled={pending} type="submit">Создать</Button>
            <Button onClick={() => setCreating(false)} type="button" variant="outline">Отмена</Button>
          </div>
        </form>
      )}
      <AsyncState empty={tasks.data?.length === 0} error={tasks.error} loading={tasks.loading}>
        <div className="space-y-3">
          {tasks.data?.map(task => (
            <Link className="block rounded-xl border bg-white p-5 hover:border-slate-400" key={task.id} to={`/tasks/${task.id}`}>
              <div className="flex items-center justify-between gap-3">
                <strong>{task.title}</strong>
                <StatusBadge status={task.status} />
              </div>
            </Link>
          ))}
        </div>
      </AsyncState>
    </section>
  )
}
