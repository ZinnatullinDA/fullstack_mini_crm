import process from 'node:process'
import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const url = process.env.CRM_SUPABASE_URL
const anonKey = process.env.CRM_SUPABASE_PUBLISHABLE_KEY || process.env.CRM_SUPABASE_ANON_KEY
const managerEmail = process.env.CRM_MANAGER_EMAIL
const managerPassword = process.env.CRM_MANAGER_PASSWORD
const executorEmail = process.env.CRM_EXECUTOR_EMAIL
const executorPassword = process.env.CRM_EXECUTOR_PASSWORD
const otherEmail = process.env.CRM_OTHER_EXECUTOR_EMAIL
const otherPassword = process.env.CRM_OTHER_EXECUTOR_PASSWORD
const ready = Boolean(
  url &&
  anonKey &&
  managerEmail &&
  managerPassword &&
  executorEmail &&
  executorPassword &&
  otherEmail &&
  otherPassword,
)

test('RLS and status transitions reject direct API bypasses', async () => {
  test.skip(
    !ready,
    'Requires a migrated Supabase project and three test accounts',
  )

  if (
    !url ||
    !anonKey ||
    !managerEmail ||
    !managerPassword ||
    !executorEmail ||
    !executorPassword ||
    !otherEmail ||
    !otherPassword
  ) {
    throw new Error('Test accounts are not configured')
  }

  const manager = createClient(url, anonKey)
  const executor = createClient(url, anonKey)
  const other = createClient(url, anonKey)
  const managerAuth = await manager.auth.signInWithPassword({
    email: managerEmail,
    password: managerPassword,
  })
  const executorAuth = await executor.auth.signInWithPassword({
    email: executorEmail,
    password: executorPassword,
  })
  const otherAuth = await other.auth.signInWithPassword({
    email: otherEmail,
    password: otherPassword,
  })

  expect(managerAuth.error).toBeNull()
  expect(executorAuth.error).toBeNull()
  expect(otherAuth.error).toBeNull()

  const managerId = managerAuth.data.user?.id
  const executorId = executorAuth.data.user?.id
  const otherId = otherAuth.data.user?.id
  if (!managerId || !executorId || !otherId)
    throw new Error('Authentication returned no user')

  const createdObject = await manager
    .from('objects')
    .insert({ name: `E2E ${Date.now()}`, address: 'Тестовый адрес' })
    .select('id')
    .single()
  expect(createdObject.error).toBeNull()
  const objectId = createdObject.data?.id as string | undefined
  if (!objectId) 
    throw new Error('Object was not created')

  try {
    const createdTask = await manager
      .from('tasks')
      .insert({
        object_id: objectId,
        title: 'Тестовая задача',
        description: '',
        assignee_id: executorId,
        author_id: managerId,
      })
      .select('id,status')
      .single()
    expect(createdTask.error).toBeNull()
    const taskId = createdTask.data?.id as string | undefined
    if (!taskId) 
      throw new Error('Task was not created')

    const ownRead = await executor.from('tasks').select('id').eq('id', taskId)
    const foreignRead = await other.from('tasks').select('id').eq('id', taskId)
    expect(ownRead.data).toHaveLength(1)
    expect(foreignRead.data).toHaveLength(0)

    const visibleObject = await executor
      .from('objects')
      .select('id')
      .eq('id', objectId)
    const hiddenObject = await other
      .from('objects')
      .select('id')
      .eq('id', objectId)
    expect(visibleObject.data).toHaveLength(1)
    expect(hiddenObject.data).toHaveLength(0)

    const foreignUpdate = await other
      .from('tasks')
      .update({ title: 'Запрещено' })
      .eq('id', taskId)
      .select('id')
    expect(foreignUpdate.data).toHaveLength(0)

    const reassign = await executor
      .from('tasks')
      .update({ assignee_id: otherId })
      .eq('id', taskId)
      .select('id')
    expect(reassign.data).toHaveLength(0)

    const roleUpdate = await executor
      .from('profiles')
      .update({ role: 'manager' })
      .eq('id', executorId)
      .select('id')
    expect(roleUpdate.error).not.toBeNull()

    const directStatus = await manager
      .from('tasks')
      .update({ status: 'accepted' })
      .eq('id', taskId)
    expect(directStatus.error).not.toBeNull()

    const fakeHistory = await executor.from('task_status_history').insert({
      task_id: taskId,
      actor_id: executorId,
      old_status: 'new',
      new_status: 'accepted',
    })
    expect(fakeHistory.error).not.toBeNull()

    const forbidden = await executor.rpc('transition_task_status', {
      p_task_id: taskId,
      p_expected_status: 'new',
      p_new_status: 'accepted',
    })
    expect(forbidden.error).not.toBeNull()

    const started = await executor.rpc('transition_task_status', {
      p_task_id: taskId,
      p_expected_status: 'new',
      p_new_status: 'in_progress',
    })
    expect(started.error).toBeNull()
    const stale = await executor.rpc('transition_task_status', {
      p_task_id: taskId,
      p_expected_status: 'new',
      p_new_status: 'in_progress',
    })
    expect(stale.error).not.toBeNull()

    const submitted = await executor.rpc('transition_task_status', {
      p_task_id: taskId,
      p_expected_status: 'in_progress',
      p_new_status: 'in_review',
    })
    expect(submitted.error).toBeNull()
    const noComment = await manager.rpc('transition_task_status', {
      p_task_id: taskId,
      p_expected_status: 'in_review',
      p_new_status: 'rework',
    })
    expect(noComment.error).not.toBeNull()
    const rework = await manager.rpc('transition_task_status', {
      p_task_id: taskId,
      p_expected_status: 'in_review',
      p_new_status: 'rework',
      p_comment: 'Исправить',
    })
    expect(rework.error).toBeNull()

    const history = await executor
      .from('task_status_history')
      .select('id,old_status,new_status,comment')
      .eq('task_id', taskId)
    expect(history.data).toHaveLength(3)
    expect(
      history.data?.find((row) => row.new_status === 'rework')?.comment,
    ).toBe('Исправить')
    const firstHistoryId = history.data?.[0]?.id as string | undefined
    if (!firstHistoryId) 
      throw new Error('History was not recorded')

    expect(
      (
        await manager
          .from('task_status_history')
          .update({ comment: 'Подделка' })
          .eq('id', firstHistoryId)
      ).error,
    ).not.toBeNull()
    expect(
      (
        await manager
          .from('task_status_history')
          .delete()
          .eq('id', firstHistoryId)
      ).error,
    ).not.toBeNull()

    const resumed = await executor.rpc('transition_task_status', {
      p_task_id: taskId,
      p_expected_status: 'rework',
      p_new_status: 'in_progress',
    })
    expect(resumed.error).toBeNull()
    const resubmitted = await executor.rpc('transition_task_status', {
      p_task_id: taskId,
      p_expected_status: 'in_progress',
      p_new_status: 'in_review',
    })
    expect(resubmitted.error).toBeNull()
    const cannotAccept = await executor.rpc('transition_task_status', {
      p_task_id: taskId,
      p_expected_status: 'in_review',
      p_new_status: 'accepted',
    })
    expect(cannotAccept.error).not.toBeNull()
    const accepted = await manager.rpc('transition_task_status', {
      p_task_id: taskId,
      p_expected_status: 'in_review',
      p_new_status: 'accepted',
    })
    expect(accepted.error).toBeNull()

    const finalHistory = await executor.from('task_status_history').select('id').eq('task_id', taskId)
    expect(finalHistory.data).toHaveLength(6)
  } finally {
    const cleanup = await manager
      .from('objects')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', objectId)
    expect(cleanup.error).toBeNull()
  }
})
