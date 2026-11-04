-- Explicitly preserve the security-invoker contract for guard_task_write.
create or replace function public.guard_task_write()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'new' or new.author_id <> auth.uid() or new.deleted_at is not null then
      raise exception 'Invalid initial task values';
    end if;
  else
    if new.id is distinct from old.id or new.author_id is distinct from old.author_id or new.created_at is distinct from old.created_at then
      raise exception 'Task identity, authorship and creation time are immutable';
    end if;
    if new.status is distinct from old.status and current_user <> 'postgres' then
      raise exception 'Use transition_task_status to change status';
    end if;
    if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then
      raise exception 'Deleted tasks cannot be restored';
    end if;
  end if;
  if new.deleted_at is null and not public.is_active_object(new.object_id) then
    raise exception 'Task object is deleted or missing';
  end if;
  if not public.is_executor(new.assignee_id) then
    raise exception 'Assignee must be an executor';
  end if;
  return new;
end;
$$;
