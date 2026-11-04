import type { FormEvent } from 'react'
import type { CrmObject } from '@/entities/task/model/types'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/features/auth/auth-provider'
import { deleteObject, listObjects, saveObject } from '@/shared/api/crm'
import { AsyncState } from '@/shared/components/async-state'
import { Button } from '@/shared/components/ui/button'
import { ConfirmDialog } from '@/shared/components/ui/confirm-dialog'
import { useQuery } from '@/shared/hooks/use-query'

export function ObjectsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { data, error, loading, reload } = useQuery(listObjects, 'objects')
  const [editing, setEditing] = useState<CrmObject | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [pending, setPending] = useState(false)
  const [deleting, setDeleting] = useState<CrmObject | null>(null)

  function edit(object: CrmObject) {
    setEditing(object)
    setName(object.name)
    setAddress(object.address)
    setCreating(false)
  }

  function create() {
    setEditing(null)
    setName('')
    setAddress('')
    setCreating(true)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)

    try {
      await saveObject({ address, name }, editing?.id)
      toast.success(editing ? 'Объект изменён' : 'Объект создан')
      setEditing(null)
      setCreating(false)
      await reload()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'Не удалось сохранить объект',
      )
    } finally {
      setPending(false)
    }
  }

  async function remove() {
    if (!deleting) 
      return

    try {
      await deleteObject(deleting.id)
      toast.success('Объект удалён')
      setDeleting(null)
      await reload()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'Не удалось удалить объект',
      )
    }
  }

  return (
    <section className="space-y-6">
      <ConfirmDialog
        description="Связанные задачи также будут скрыты. История сохранится в базе."
        onConfirm={() => void remove()}
        onOpenChange={(open) => !open && setDeleting(null)}
        open={Boolean(deleting)}
        title={`Удалить объект «${deleting?.name || ''}»?`}
      />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Объекты</h1>
        {profile?.role === 'manager' && (
          <Button onClick={create}>Добавить объект</Button>
        )}
      </div>
      {(creating || editing) && (
        <form
          className="space-y-4 rounded-xl border bg-white p-5"
          onSubmit={submit}
        >
          <h2 className="text-lg font-semibold">
            {editing ? 'Редактировать объект' : 'Новый объект'}
          </h2>
          <label className="block space-y-1">
            <span>Название</span>
            <input
              className="w-full rounded border p-2"
              maxLength={200}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>
          <label className="block space-y-1">
            <span>Адрес</span>
            <input
              className="w-full rounded border p-2"
              maxLength={500}
              onChange={(event) => setAddress(event.target.value)}
              required
              value={address}
            />
          </label>
          <div className="flex gap-2">
            <Button disabled={pending} type="submit">
              Сохранить
            </Button>
            <Button
              onClick={() => {
                setEditing(null)
                setCreating(false)
              }}
              type="button"
              variant="outline"
            >
              Отмена
            </Button>
          </div>
        </form>
      )}
      <AsyncState empty={data?.length === 0} error={error} loading={loading}>
        <div className="grid gap-4 md:grid-cols-2">
          {data?.map((object) => (
            <article
              aria-label={`Открыть объект ${object.name}`}
              className="cursor-pointer rounded-xl border bg-white p-5 shadow-sm transition hover:border-slate-400 hover:shadow-md"
              key={object.id}
              onClick={(event) => {
                const target = event.target as HTMLElement
                if (target.closest('a, button, input, textarea, select'))
                  return
                navigate(`/objects/${object.id}`)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  navigate(`/objects/${object.id}`)
                }
              }}
              role="link"
              tabIndex={0}
            >
              <Link
                className="text-lg font-semibold hover:underline"
                to={`/objects/${object.id}`}
              >
                {object.name}
              </Link>
              <p className="mt-1 text-sm text-slate-600">{object.address}</p>
              {profile?.role === 'manager' && (
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={() => edit(object)}
                    size="sm"
                    variant="outline"
                  >
                    Изменить
                  </Button>
                  <Button
                    onClick={() => setDeleting(object)}
                    size="sm"
                    variant="destructive"
                  >
                    Удалить
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      </AsyncState>
    </section>
  )
}
