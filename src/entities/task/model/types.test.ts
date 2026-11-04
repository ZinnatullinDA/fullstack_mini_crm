import type { Profile, Task, TaskStatus } from '@/entities/task/model/types'
import { describe, expect, it } from 'vitest'
import { availableTransitions } from '@/entities/task/model/types'

const manager: Profile = {
  id: 'manager',
  role: 'manager',
  display_name: 'Постановщик',
}
const executor: Profile = {
  id: 'executor',
  role: 'executor',
  display_name: 'Исполнитель',
}
const other: Profile = { id: 'other', role: 'executor', display_name: 'Другой' }

function task(status: TaskStatus): Task {
  return {
    id: 'task',
    object_id: 'object',
    title: 'Задача',
    description: '',
    assignee_id: executor.id,
    author_id: manager.id,
    status,
    created_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
  }
}

describe('availableTransitions', () => {
  it.each([
    ['new', ['in_progress']],
    ['in_progress', ['in_review']],
    ['in_review', []],
    ['accepted', []],
    ['rework', ['in_progress']],
  ] as const)('shows executor actions for %s', (status, expected) => {
    expect(availableTransitions(task(status), executor)).toEqual(expected)
  })

  it('shows only review decisions to a manager', () => {
    expect(availableTransitions(task('in_review'), manager)).toEqual([
      'accepted',
      'rework',
    ])
    expect(availableTransitions(task('new'), manager)).toEqual([])
  })

  it('hides actions for another executor', () => {
    expect(availableTransitions(task('new'), other)).toEqual([])
  })
})
