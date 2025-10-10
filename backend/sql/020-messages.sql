-- Internal messaging tables, policies, and helper functions

-- Ensure bucket for internal message attachments exists
insert into storage.buckets (id, name, public)
values ('internal-message-files', 'internal-message-files', false)
on conflict (id) do nothing;

-- Message threads table
create table if not exists message_threads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  work_order_id uuid references work_orders(id) on delete set null,
  participants uuid[] not null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_message_threads_org_latest
  on message_threads (org_id, last_message_at desc);

create index if not exists idx_message_threads_work_order
  on message_threads (work_order_id);

create index if not exists idx_message_threads_participants
  on message_threads using gin (participants);

alter table message_threads enable row level security;

drop policy if exists "message_threads_select" on message_threads;
drop policy if exists "message_threads_write" on message_threads;

drop policy if exists "Message threads read" on message_threads;
drop policy if exists "Message threads write" on message_threads;

create policy "Message threads read" on message_threads
  for select
  using (
    org_id = get_user_org_id()
    and auth.uid() = any(participants)
  );

create policy "Message threads insert" on message_threads
  for insert
  with check (
    org_id = get_user_org_id()
    and auth.uid() = any(participants)
    and get_user_role() in ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN')
  );

create policy "Message threads update" on message_threads
  for update
  using (
    org_id = get_user_org_id()
    and auth.uid() = any(participants)
  )
  with check (
    org_id = get_user_org_id()
    and auth.uid() = any(participants)
  );

create policy "Message threads delete" on message_threads
  for delete
  using (
    org_id = get_user_org_id()
    and get_user_role() in ('OWNER','MANAGER')
  );

-- Internal messages table
create table if not exists internal_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  thread_id uuid not null references message_threads(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  recipient_id uuid references profiles(id),
  work_order_id uuid references work_orders(id) on delete set null,
  body text not null,
  priority text not null default 'normal',
  attachments jsonb default '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table internal_messages
  add constraint internal_messages_priority_check
  check (priority in ('normal','urgent'));

create index if not exists idx_internal_messages_thread
  on internal_messages (thread_id, created_at desc);

create index if not exists idx_internal_messages_org
  on internal_messages (org_id, created_at desc);

create index if not exists idx_internal_messages_work_order
  on internal_messages (work_order_id);

create index if not exists idx_internal_messages_unread
  on internal_messages (recipient_id, read_at) where read_at is null;

alter table internal_messages enable row level security;

drop policy if exists "Internal messages select" on internal_messages;
drop policy if exists "Internal messages modify" on internal_messages;

drop policy if exists "Internal messages read" on internal_messages;
drop policy if exists "Internal messages write" on internal_messages;

create policy "Internal messages read" on internal_messages
  for select
  using (
    org_id = get_user_org_id()
    and (
      sender_id = auth.uid()
      or recipient_id = auth.uid()
      or exists (
        select 1
        from message_threads mt
        where mt.id = internal_messages.thread_id
          and auth.uid() = any(mt.participants)
      )
    )
  );

create policy "Internal messages insert" on internal_messages
  for insert
  with check (
    org_id = get_user_org_id()
    and sender_id = auth.uid()
    and exists (
      select 1
      from message_threads mt
      where mt.id = internal_messages.thread_id
        and auth.uid() = any(mt.participants)
    )
  );

create policy "Internal messages update" on internal_messages
  for update
  using (
    org_id = get_user_org_id()
    and (
      sender_id = auth.uid()
      or recipient_id = auth.uid()
      or (
        exists (
          select 1
          from message_threads mt
          where mt.id = internal_messages.thread_id
            and auth.uid() = any(mt.participants)
        )
        and get_user_role() in ('OWNER','MANAGER','SERVICE_ADVISOR')
      )
    )
  )
  with check (
    org_id = get_user_org_id()
    and (
      sender_id = auth.uid()
      or recipient_id = auth.uid()
      or get_user_role() in ('OWNER','MANAGER','SERVICE_ADVISOR')
    )
  );

-- Storage policies for internal attachments
create policy if not exists "internal_message_read"
  on storage.objects for select
  using (
    bucket_id = 'internal-message-files'
    and (
      auth.role() = 'service_role'
      or exists (
        select 1
        from internal_messages im
        join message_threads mt on mt.id = im.thread_id
        where im.org_id = get_user_org_id()
          and auth.uid() = any(mt.participants)
          and jsonb_path_exists(
            im.attachments,
            '$[*] ? (@.storage_path == $path)',
            jsonb_build_object('path', to_jsonb(storage.objects.name))
          )
      )
    )
  );

create policy if not exists "internal_message_insert"
  on storage.objects for insert
  with check (bucket_id = 'internal-message-files' and auth.role() = 'service_role');

create policy if not exists "internal_message_delete"
  on storage.objects for delete
  using (bucket_id = 'internal-message-files' and auth.role() = 'service_role');

-- Helper function: unread count for current user
create or replace function internal_message_unread_count()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)
  from internal_messages im
  join message_threads mt on mt.id = im.thread_id
  where im.org_id = get_user_org_id()
    and auth.uid() = any(mt.participants)
    and im.sender_id <> auth.uid()
    and im.read_at is null;
$$;

revoke all on function internal_message_unread_count() from public;
grant execute on function internal_message_unread_count() to authenticated;
grant execute on function internal_message_unread_count() to service_role;

-- Helper function: unread counts grouped by thread for the current user
create or replace function internal_message_unread_counts()
returns table(thread_id uuid, unread integer)
language sql
security definer
stable
set search_path = public
as $$
  select im.thread_id, count(*)::integer as unread
  from internal_messages im
  join message_threads mt on mt.id = im.thread_id
  where im.org_id = get_user_org_id()
    and auth.uid() = any(mt.participants)
    and im.sender_id <> auth.uid()
    and im.read_at is null
  group by im.thread_id;
$$;

revoke all on function internal_message_unread_counts() from public;
grant execute on function internal_message_unread_counts() to authenticated;
grant execute on function internal_message_unread_counts() to service_role;

-- Helper function: mark messages read for the current user
create or replace function mark_internal_messages_read(p_thread_id uuid, p_message_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update internal_messages im
  set read_at = coalesce(im.read_at, now())
  from message_threads mt
  where mt.id = im.thread_id
    and im.org_id = get_user_org_id()
    and im.thread_id = p_thread_id
    and auth.uid() = any(mt.participants)
    and im.sender_id <> auth.uid()
    and (p_message_ids is null or im.id = any(p_message_ids))
    and im.read_at is null;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function mark_internal_messages_read(uuid, uuid[]) from public;
grant execute on function mark_internal_messages_read(uuid, uuid[]) to authenticated;
grant execute on function mark_internal_messages_read(uuid, uuid[]) to service_role;
