import type {
  CrmObject,
  Profile,
  StatusHistory,
  Task,
  TaskStatus,
} from '@/entities/task/model/types'
import { supabase } from '@/shared/api/supabase'

function client() {
  if (!supabase) {
    throw new Error(
      'Не настроено подключение к Supabase. Заполните .env.local.',
    )
  }

  return supabase
}

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) 
    throw new Error(error.message)

  if (data === null) 
    throw new Error('Сервер не вернул данные')

  return data
}

function ensure(error: { message: string } | null): void {
  if (error) 
    throw new Error(error.message)
}

export async function listObjects(): Promise<CrmObject[]> {
  const { data, error } = await client()
    .from('objects')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return unwrap<CrmObject[]>(data, error)
}

export async function getObject(id: string): Promise<CrmObject> {
  const { data, error } = await client()
    .from('objects')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  return unwrap<CrmObject>(data, error)
}

export async function saveObject(
  value: Pick<CrmObject, 'name' | 'address'>,
  id?: string,
): Promise<void> {
  if (id) {
    const { data, error } = await client().from('objects').update(value).eq('id', id).select('id').single()
    unwrap(data, error)
  } else {
    const { error } = await client().from('objects').insert(value)
    ensure(error)
  }
}

export async function deleteObject(id: string): Promise<void> {
  const { error } = await client().rpc('soft_delete_object', { p_object_id: id })
  ensure(error)
}

export async function listTasks(
  objectId?: string,
  assigneeId?: string,
): Promise<Task[]> {
  let query = client()
    .from('tasks')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (objectId) 
    query = query.eq('object_id', objectId)

  if (assigneeId) 
    query = query.eq('assignee_id', assigneeId)

  const { data, error } = await query

  return unwrap<Task[]>(data, error)
}

export async function getTask(id: string): Promise<Task> {
  const { data, error } = await client()
    .from('tasks')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  return unwrap<Task>(data, error)
}

export type TaskInput = Pick<
  Task,
  'object_id' | 'title' | 'description' | 'assignee_id'
>

export async function saveTask(
  value: TaskInput,
  authorId: string,
  id?: string,
): Promise<void> {
  if (id) {
    const { data, error } = await client().from('tasks').update(value).eq('id', id).select('id').single()
    unwrap(data, error)
  } else {
    const { error } = await client()
      .from('tasks')
      .insert({ ...value, author_id: authorId })
    ensure(error)
  }
}

export async function deleteTask(id: string): Promise<void> {
  const { count, error } = await client()
    .from('tasks')
    .update({
      deleted_at: new Date().toISOString(),
    }, { count: 'exact' })
    .eq('id', id)
  ensure(error)
  if (count !== 1)
    throw new Error('Задача не найдена или удаление запрещено')
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await client()
    .from('profiles')
    .select('id,role,display_name')
    .order('display_name')

  return unwrap<Profile[]>(data, error)
}

export async function listHistory(taskId: string): Promise<StatusHistory[]> {
  const { data, error } = await client()
    .from('task_status_history')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at')

  return unwrap<StatusHistory[]>(data, error)
}

export async function transitionTask(
  task: Task,
  status: TaskStatus,
  comment?: string,
): Promise<void> {
  const { error } = await client().rpc('transition_task_status', {
    p_task_id: task.id,
    p_expected_status: task.status,
    p_new_status: status,
    p_comment: comment ?? null,
  })
  ensure(error)
}
