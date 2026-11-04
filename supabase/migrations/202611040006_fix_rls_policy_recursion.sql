create function public.is_executor(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = p_user_id and role = 'executor')
$$;

create function public.is_active_object(p_object_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.objects where id = p_object_id and deleted_at is null)
$$;

revoke all on function public.is_executor(uuid), public.is_active_object(uuid) from public, anon, authenticated;
grant execute on function public.is_executor(uuid), public.is_active_object(uuid) to authenticated;

drop policy tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated with check (
  public.current_app_role() = 'manager' and author_id = (select auth.uid())
  and status = 'new' and deleted_at is null
  and public.is_executor(assignee_id) and public.is_active_object(object_id)
);
