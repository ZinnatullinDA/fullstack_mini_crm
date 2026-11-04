create or replace function public.soft_delete_object_tasks()
returns trigger
language plpgsql
security definer
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

revoke all on function public.soft_delete_object_tasks() from public, anon, authenticated;
