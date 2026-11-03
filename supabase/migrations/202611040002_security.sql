create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

create policy profiles_select on public.profiles
for select to authenticated
using (
  public.current_app_role() = 'manager'
  or id = (select auth.uid())
  or exists (
    select 1 from public.tasks t
    where t.assignee_id = (select auth.uid())
      and t.deleted_at is null
      and (t.author_id = profiles.id or t.assignee_id = profiles.id)
  )
);

create policy objects_select on public.objects
for select to authenticated
using (
  deleted_at is null
  and (
    public.current_app_role() = 'manager'
    or exists (
      select 1 from public.tasks t
      where t.object_id = objects.id
        and t.assignee_id = (select auth.uid())
        and t.deleted_at is null
    )
  )
);

create policy objects_insert on public.objects
for insert to authenticated
with check (public.current_app_role() = 'manager' and deleted_at is null);

create policy objects_update on public.objects
for update to authenticated
using (public.current_app_role() = 'manager' and deleted_at is null)
with check (public.current_app_role() = 'manager');

create policy tasks_select on public.tasks
for select to authenticated
using (
  deleted_at is null
  and (public.current_app_role() = 'manager' or assignee_id = (select auth.uid()))
);

create policy tasks_insert on public.tasks
for insert to authenticated
with check (
  public.current_app_role() = 'manager'
  and author_id = (select auth.uid())
  and status = 'new'
  and deleted_at is null
  and exists (select 1 from public.profiles p where p.id = assignee_id and p.role = 'executor')
  and exists (select 1 from public.objects o where o.id = object_id and o.deleted_at is null)
);

create policy tasks_update on public.tasks
for update to authenticated
using (public.current_app_role() = 'manager' and deleted_at is null)
with check (public.current_app_role() = 'manager');

create policy task_history_select on public.task_status_history
for select to authenticated
using (
  public.current_app_role() = 'manager'
  or exists (
    select 1 from public.tasks t
    where t.id = task_id
      and t.assignee_id = (select auth.uid())
      and t.deleted_at is null
  )
);

create function public.guard_task_write()
returns trigger
language plpgsql
set search_path = ''
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

  if new.deleted_at is null and not exists (
    select 1 from public.objects o where o.id = new.object_id and o.deleted_at is null
  ) then
    raise exception 'Task object is deleted or missing';
  end if;
  if not exists (
    select 1 from public.profiles p where p.id = new.assignee_id and p.role = 'executor'
  ) then
    raise exception 'Assignee must be an executor';
  end if;
  return new;
end;
$$;

create trigger guard_task_before_write
before insert or update on public.tasks
for each row execute function public.guard_task_write();

create function public.soft_delete_object_tasks()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'Object identity and creation time are immutable';
  end if;
  if old.deleted_at is null and new.deleted_at is not null then
    update public.tasks set deleted_at = new.deleted_at
    where object_id = new.id and deleted_at is null;
  end if;
  if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then
    raise exception 'Deleted objects cannot be restored';
  end if;
  return new;
end;
$$;

create trigger soft_delete_object_before_update
before update on public.objects
for each row execute function public.soft_delete_object_tasks();
