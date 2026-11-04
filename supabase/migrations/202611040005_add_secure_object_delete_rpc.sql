create function public.soft_delete_object(p_object_id uuid)
returns public.objects
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_object public.objects;
begin
  if (public.current_app_role() <> 'manager') then
    raise exception 'Manager role required' using errcode = '42501';
  end if;
  update public.objects set deleted_at = now()
  where id = p_object_id and deleted_at is null
  returning * into v_object;
  if not found then
    raise exception 'Object not found' using errcode = 'P0002';
  end if;
  return v_object;
end;
$$;

revoke all on function public.soft_delete_object(uuid) from public, anon, authenticated;
grant execute on function public.soft_delete_object(uuid) to authenticated;
