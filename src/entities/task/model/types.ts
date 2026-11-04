export type Role = 'manager' | 'executor'

export type TaskStatus =
  'new' | 'in_progress' | 'in_review' | 'accepted' | 'rework'

export interface Profile {
  id: string
  role: Role
  display_name: string
}

export interface CrmObject {
  id: string
  name: string
  address: string
  created_at: string
  deleted_at: string | null
}

export interface Task {
  id: string
  object_id: string
  title: string
  description: string
  assignee_id: string
  author_id: string
  status: TaskStatus
  created_at: string
  deleted_at: string | null
}

export interface StatusHistory {
  id: string
  task_id: string
  actor_id: string
  old_status: TaskStatus
  new_status: TaskStatus
  comment: string | null
  created_at: string
}

export const statusLabels: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  in_review: 'На проверке',
  accepted: 'Принята',
  rework: 'На доработке',
}

export function availableTransitions(
  task: Task,
  profile: Profile,
): TaskStatus[] {
  if (profile.role === 'manager') {
    return task.status === 'in_review' ? ['accepted', 'rework'] : []
  }

  if (task.assignee_id !== profile.id) 
    return []

  if (task.status === 'new' || task.status === 'rework') 
    return ['in_progress']

  if (task.status === 'in_progress') 
    return ['in_review']

  return []
}
