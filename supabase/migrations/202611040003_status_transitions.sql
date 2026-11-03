create function public.transition_task_status(
  p_task_id uuid,
  p_expected_status public.task_status,
  p_new_status public.task_status,
  p_comment text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.tasks%rowtype;
  v_actor uuid := auth.uid();
  v_role public.app_role;
  v_comment text := nullif(trim(p_comment), '');
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = v_actor;
  if v_role is null then
    raise exception 'Profile required' using errcode = '42501';
  end if;

  select * into v_task
  from public.tasks
  where id = p_task_id and deleted_at is null
  for update;

  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;
  if v_task.status <> p_expected_status then
    raise exception 'Task status changed concurrently' using errcode = '40001';
  end if;

  if not (
    (v_role = 'executor' and v_task.assignee_id = v_actor and (
      (v_task.status = 'new' and p_new_status = 'in_progress')
      or (v_task.status = 'in_progress' and p_new_status = 'in_review')
      or (v_task.status = 'rework' and p_new_status = 'in_progress')
    ))
    or (v_role = 'manager' and v_task.status = 'in_review' and p_new_status in ('accepted', 'rework'))
  ) then
    raise exception 'Transition is not allowed' using errcode = '42501';
  end if;
  if p_new_status = 'rework' and v_comment is null then
    raise exception 'Comment is required for rework' using errcode = '22023';
  end if;

  update public.tasks set status = p_new_status where id = p_task_id returning * into v_task;

  insert into public.task_status_history (task_id, actor_id, old_status, new_status, comment)
  values (p_task_id, v_actor, p_expected_status, p_new_status, v_comment);

  return v_task;
end;
$$;

revoke all on function public.transition_task_status(uuid, public.task_status, public.task_status, text) from public, anon;
grant execute on function public.transition_task_status(uuid, public.task_status, public.task_status, text) to authenticated;
