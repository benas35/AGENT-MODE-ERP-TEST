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

-- ---------------------------------------------------------------------------
-- Customer portal communication + session management
-- ---------------------------------------------------------------------------

-- Ensure bucket for customer portal uploads exists
insert into storage.buckets (id, name, public)
values ('customer-portal-files', 'customer-portal-files', false)
on conflict (id) do nothing;

-- Helper claims accessors ----------------------------------------------------

create or replace function customer_portal_claim(claim text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> claim,
      ''
    );
$$;

revoke all on function customer_portal_claim(text) from public;
grant execute on function customer_portal_claim(text) to authenticated;
grant execute on function customer_portal_claim(text) to anon;
grant execute on function customer_portal_claim(text) to service_role;

create or replace function current_portal_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select nullif(customer_portal_claim('customer_id'), '')::uuid;
$$;

revoke all on function current_portal_customer_id() from public;
grant execute on function current_portal_customer_id() to authenticated;
grant execute on function current_portal_customer_id() to anon;
grant execute on function current_portal_customer_id() to service_role;

create or replace function current_portal_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select nullif(customer_portal_claim('org_id'), '')::uuid;
$$;

revoke all on function current_portal_org_id() from public;
grant execute on function current_portal_org_id() to authenticated;
grant execute on function current_portal_org_id() to anon;
grant execute on function current_portal_org_id() to service_role;

-- Customer portal sessions ---------------------------------------------------

create table if not exists customer_portal_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  work_order_id uuid references work_orders(id) on delete set null,
  magic_token text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  constraint customer_portal_sessions_token_length check (char_length(magic_token) >= 32)
);

create index if not exists idx_customer_portal_sessions_lookup
  on customer_portal_sessions (magic_token);

create index if not exists idx_customer_portal_sessions_customer
  on customer_portal_sessions (customer_id, expires_at desc);

alter table customer_portal_sessions enable row level security;

drop policy if exists "Customer portal sessions manage" on customer_portal_sessions;
drop policy if exists "Customer portal sessions read" on customer_portal_sessions;

create policy "Customer portal sessions manage" on customer_portal_sessions
  for all
  using (
    org_id = get_user_org_id()
  )
  with check (
    org_id = get_user_org_id()
  );

create policy "Customer portal sessions read portal" on customer_portal_sessions
  for select
  using (
    customer_id = current_portal_customer_id()
    and org_id = current_portal_org_id()
  );

-- Customer notification preferences -----------------------------------------

create table if not exists customer_notification_preferences (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  notify_email boolean not null default true,
  notify_sms boolean not null default true,
  notify_whatsapp boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (customer_id)
);

create index if not exists idx_customer_notification_preferences_org
  on customer_notification_preferences (org_id);

alter table customer_notification_preferences enable row level security;

drop policy if exists "Customer notification prefs manage" on customer_notification_preferences;

create policy "Customer notification prefs manage" on customer_notification_preferences
  for all
  using (
    org_id = get_user_org_id()
  )
  with check (
    org_id = get_user_org_id()
  );

create policy "Customer notification prefs portal" on customer_notification_preferences
  for select
  using (
    customer_id = current_portal_customer_id()
    and org_id = current_portal_org_id()
  );

-- Customer visible message threads ------------------------------------------

create table if not exists customer_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  work_order_id uuid not null references work_orders(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  sender_profile_id uuid references profiles(id),
  direction text not null default 'staff' check (direction in ('staff', 'customer')),
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  read_by_customer_at timestamptz,
  read_by_staff_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_messages_work_order
  on customer_messages (work_order_id, created_at desc);

create index if not exists idx_customer_messages_customer_unread
  on customer_messages (customer_id)
  where direction = 'staff' and read_by_customer_at is null;

create index if not exists idx_customer_messages_org
  on customer_messages (org_id, created_at desc);

alter table customer_messages enable row level security;

drop policy if exists "Customer messages read" on customer_messages;
drop policy if exists "Customer messages insert" on customer_messages;
drop policy if exists "Customer messages update" on customer_messages;

create policy "Customer messages staff read" on customer_messages
  for select
  using (
    org_id = get_user_org_id()
  );

create policy "Customer messages staff insert" on customer_messages
  for insert
  with check (
    org_id = get_user_org_id()
    and get_user_role() in ('OWNER','MANAGER','SERVICE_ADVISOR')
  );

create policy "Customer messages staff update" on customer_messages
  for update
  using (
    org_id = get_user_org_id()
    and get_user_role() in ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN')
  )
  with check (
    org_id = get_user_org_id()
    and get_user_role() in ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN')
  );

create policy "Customer messages portal read" on customer_messages
  for select
  using (
    direction in ('staff', 'customer')
    and customer_id = current_portal_customer_id()
    and org_id = current_portal_org_id()
  );

create policy "Customer messages portal insert" on customer_messages
  for insert
  with check (
    direction = 'customer'
    and customer_id = current_portal_customer_id()
    and org_id = current_portal_org_id()
  );

create policy "Customer messages portal update" on customer_messages
  for update
  using (
    customer_id = current_portal_customer_id()
    and org_id = current_portal_org_id()
  )
  with check (
    customer_id = current_portal_customer_id()
    and org_id = current_portal_org_id()
  );

-- RPC to log approvals / decline decisions ----------------------------------

create or replace function customer_portal_update_work_order(
  p_work_order_id uuid,
  p_customer_id uuid,
  p_org_id uuid,
  p_status text,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
  v_previous_status text;
begin
  select exists (
    select 1
    from work_orders wo
    where wo.id = p_work_order_id
      and wo.org_id = p_org_id
      and wo.customer_id = p_customer_id
  ) into v_allowed;

  if not v_allowed then
    raise exception 'Work order not accessible';
  end if;

  select status into v_previous_status from work_orders where id = p_work_order_id;

  update work_orders
  set status = p_status,
      updated_at = now()
  where id = p_work_order_id;

  insert into customer_messages (
    org_id,
    work_order_id,
    customer_id,
    direction,
    body,
    metadata
  )
  values (
    p_org_id,
    p_work_order_id,
    p_customer_id,
    'customer',
    coalesce(p_comment, '') || case when p_status = 'APPROVED' then ' ✅ Approved additional work' else ' ❌ Declined additional work' end,
    jsonb_build_object(
      'type', 'approval',
      'previous_status', v_previous_status,
      'new_status', p_status
    )
  );

  return jsonb_build_object(
    'previous_status', v_previous_status,
    'new_status', p_status
  );
end;
$$;

revoke all on function customer_portal_update_work_order(uuid, uuid, uuid, text, text) from public;
grant execute on function customer_portal_update_work_order(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function customer_portal_update_work_order(uuid, uuid, uuid, text, text) to service_role;
grant execute on function customer_portal_update_work_order(uuid, uuid, uuid, text, text) to anon;

