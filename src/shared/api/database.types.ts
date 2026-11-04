import type {
  CrmObject,
  Profile,
  Role,
  StatusHistory,
  Task,
  TaskStatus,
} from '@/entities/task/model/types'

interface Table<Row, Insert, Update> {
  Row: Row & Record<string, unknown>
  Insert: Insert & Record<string, unknown>
  Update: Update & Record<string, unknown>
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile, Profile, Partial<Pick<Profile, 'display_name'>>>
      objects: Table<
        CrmObject,
        Pick<CrmObject, 'name' | 'address'> & Partial<CrmObject>,
        Partial<CrmObject>
      >
      tasks: Table<
        Task,
        Pick<
          Task,
          'object_id' | 'title' | 'description' | 'assignee_id' | 'author_id'
        > &
          Partial<Task>,
        Partial<Task>
      >
      task_status_history: Table<
        StatusHistory,
        Partial<StatusHistory>,
        Partial<StatusHistory>
      >
    }
    Views: Record<never, never>
    Functions: {
      current_app_role: { Args: Record<never, never>; Returns: Role }
      transition_task_status: {
        Args: {
          p_task_id: string
          p_expected_status: TaskStatus
          p_new_status: TaskStatus
          p_comment?: string | null
        }
        Returns: Task
      }
    }
    Enums: { app_role: Role; task_status: TaskStatus }
    CompositeTypes: Record<never, never>
  }
}
