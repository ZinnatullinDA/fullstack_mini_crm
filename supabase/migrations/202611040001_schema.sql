-- Apply only after inspecting the target project's existing schema.
create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('manager', 'executor');
create type public.task_status as enum ('new', 'in_progress', 'in_review', 'accepted', 'rework');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'executor',
  display_name text not null default '' check (length(display_name) <= 120)
);

create table public.objects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  address text not null check (length(trim(address)) between 1 and 500),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.objects (id) on delete restrict,
  title text not null check (length(trim(title)) between 1 and 200),
  description text not null default '',
  assignee_id uuid not null references public.profiles (id) on delete restrict,
  author_id uuid not null references public.profiles (id) on delete restrict,
  status public.task_status not null default 'new',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.task_status_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete restrict,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  old_status public.task_status not null,
  new_status public.task_status not null,
  comment text,
  created_at timestamptz not null default now(),
  check (old_status <> new_status),
  check (new_status <> 'rework' or length(trim(coalesce(comment, ''))) > 0)
);

create index tasks_object_active_idx on public.tasks (object_id, created_at desc) where deleted_at is null;
create index tasks_assignee_active_idx on public.tasks (assignee_id, created_at desc) where deleted_at is null;
create index tasks_author_idx on public.tasks (author_id);
create index task_history_task_time_idx on public.task_status_history (task_id, created_at, id);
create index objects_active_idx on public.objects (created_at desc) where deleted_at is null;

alter table public.profiles enable row level security;
alter table public.objects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_status_history enable row level security;

revoke all on public.profiles, public.objects, public.tasks, public.task_status_history from anon;
revoke all on public.profiles, public.objects, public.tasks, public.task_status_history from authenticated;
grant select on public.profiles, public.objects, public.tasks, public.task_status_history to authenticated;
grant insert, update on public.objects, public.tasks to authenticated;

create function public.create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'executor', coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

revoke all on function public.create_profile_for_user() from public, anon, authenticated;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute function public.create_profile_for_user();
