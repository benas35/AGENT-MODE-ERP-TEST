-- Planner system schema (technicians, bays, appointments) with RLS and helpers

-- Technicians table
create table if not exists technicians (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  skills text[] default '{}'::text[],
  availability jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table technicians
  add column if not exists org_id uuid not null references organizations(id) on delete cascade;

alter table technicians
  add column if not exists user_id uuid references profiles(id) on delete set null;

alter table technicians
  add column if not exists skills text[] default '{}'::text[];

alter table technicians
  add column if not exists availability jsonb default '[]'::jsonb;

alter table technicians
  add column if not exists created_at timestamptz not null default now();

alter table technicians enable row level security;

drop policy if exists "Technicians read" on technicians;
drop policy if exists "Technicians insert" on technicians;
drop policy if exists "Technicians update" on technicians;
drop policy if exists "Technicians delete" on technicians;

create policy "Technicians read" on technicians
  for select
  using (org_id = get_user_org_id());

create policy "Technicians insert" on technicians
  for insert
  with check (org_id = get_user_org_id());

create policy "Technicians update" on technicians
  for update
  using (org_id = get_user_org_id())
  with check (org_id = get_user_org_id());

create policy "Technicians delete" on technicians
  for delete
  using (org_id = get_user_org_id());

create index if not exists idx_technicians_org on technicians (org_id);

-- Bays table
create table if not exists bays (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table bays
  add column if not exists org_id uuid not null references organizations(id) on delete cascade;

alter table bays
  add column if not exists name text not null;

alter table bays
  add column if not exists created_at timestamptz not null default now();

alter table bays enable row level security;

drop policy if exists "Bays read" on bays;
drop policy if exists "Bays insert" on bays;
drop policy if exists "Bays update" on bays;
drop policy if exists "Bays delete" on bays;

create policy "Bays read" on bays
  for select
  using (org_id = get_user_org_id());

create policy "Bays insert" on bays
  for insert
  with check (org_id = get_user_org_id());

create policy "Bays update" on bays
  for update
  using (org_id = get_user_org_id())
  with check (org_id = get_user_org_id());

create policy "Bays delete" on bays
  for delete
  using (org_id = get_user_org_id());

create index if not exists idx_bays_org on bays (org_id);

-- Appointments table
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  customer_id uuid references customers(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  technician_id uuid references technicians(id) on delete set null,
  bay_id uuid references bays(id) on delete set null,
  status text not null default 'scheduled',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  notes text,
  priority int default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table appointments
  add column if not exists org_id uuid not null references organizations(id) on delete cascade;

alter table appointments
  add column if not exists title text not null;

alter table appointments
  add column if not exists customer_id uuid references customers(id) on delete set null;

alter table appointments
  add column if not exists vehicle_id uuid references vehicles(id) on delete set null;

alter table appointments
  add column if not exists technician_id uuid references technicians(id) on delete set null;

alter table appointments
  add column if not exists bay_id uuid references bays(id) on delete set null;

alter table appointments
  add column if not exists status text not null default 'scheduled';

alter table appointments
  add column if not exists starts_at timestamptz not null;

alter table appointments
  add column if not exists ends_at timestamptz not null;

alter table appointments
  add column if not exists notes text;

alter table appointments
  add column if not exists priority int default 0;

alter table appointments
  add column if not exists created_by uuid references profiles(id) on delete set null;

alter table appointments
  add column if not exists created_at timestamptz not null default now();

alter table appointments
  add column if not exists updated_at timestamptz not null default now();

alter table appointments
  add constraint appointments_status_check
  check (status in ('scheduled','in_progress','waiting_parts','completed'));

alter table appointments
  add constraint appointments_time_check
  check (ends_at > starts_at);

create index if not exists idx_appointments_org_starts_at on appointments (org_id, starts_at);
create index if not exists idx_appointments_technician_starts on appointments (technician_id, starts_at);
create index if not exists idx_appointments_bay_starts on appointments (bay_id, starts_at);
create index if not exists idx_appointments_status on appointments (status);

alter table appointments enable row level security;

drop policy if exists "Appointments read" on appointments;
drop policy if exists "Appointments insert" on appointments;
drop policy if exists "Appointments update" on appointments;
drop policy if exists "Appointments delete" on appointments;

create policy "Appointments read" on appointments
  for select
  using (org_id = get_user_org_id());

create policy "Appointments insert" on appointments
  for insert
  with check (org_id = get_user_org_id());

create policy "Appointments update" on appointments
  for update
  using (org_id = get_user_org_id())
  with check (org_id = get_user_org_id());

create policy "Appointments delete" on appointments
  for delete
  using (org_id = get_user_org_id());

-- can_schedule helper to guard overlapping appointments
create or replace function can_schedule(
  _org uuid,
  _technician uuid,
  _bay uuid,
  _start timestamptz,
  _end timestamptz,
  _appointment uuid default null
) returns boolean
language plpgsql
stable
as $$
declare
  has_conflict boolean;
begin
  select exists (
    select 1
    from appointments a
    where a.org_id = _org
      and (_appointment is null or a.id <> _appointment)
      and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(_start, _end, '[)')
      and (
        (_technician is not null and a.technician_id = _technician)
        or (_bay is not null and a.bay_id = _bay)
      )
  )
  into has_conflict;

  return not coalesce(has_conflict, false);
end;
$$;

-- Realtime publication (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'appointments'
  ) then
    execute 'alter publication supabase_realtime add table appointments';
  end if;
exception when undefined_object then
  -- supabase_realtime publication may not exist in local tests
  null;
end;
$$;

-- Seed demo technicians, bays, and appointments for the ProFix org
with org as (
  select '550e8400-e29b-41d4-a716-446655440000'::uuid as org_id
),
technician_seed as (
  select *
  from (values
    ('550e8400-e29b-41d4-a716-446655441000'::uuid, '550e8400-e29b-41d4-a716-446655440102'::uuid, array['engine','diagnostics'], '[{"weekday":1,"from":"08:00","to":"17:00"}]'::jsonb),
    ('550e8400-e29b-41d4-a716-446655441001'::uuid, null::uuid, array['suspension','tires'], '[{"weekday":2,"from":"08:00","to":"17:00"}]'::jsonb),
    ('550e8400-e29b-41d4-a716-446655441002'::uuid, null::uuid, array['electrical'], '[{"weekday":3,"from":"10:00","to":"19:00"}]'::jsonb)
  ) as t(id, user_id, skills, availability)
)
insert into technicians (id, org_id, user_id, skills, availability)
select t.id, o.org_id, t.user_id, t.skills, t.availability
from org o
cross join technician_seed t
on conflict (id) do update set
  org_id = excluded.org_id,
  user_id = excluded.user_id,
  skills = excluded.skills,
  availability = excluded.availability;

with org as (
  select '550e8400-e29b-41d4-a716-446655440000'::uuid as org_id
),
bay_seed as (
  select *
  from (values
    ('550e8400-e29b-41d4-a716-446655441100'::uuid, 'Lift A'),
    ('550e8400-e29b-41d4-a716-446655441101'::uuid, 'Lift B')
  ) as b(id, name)
)
insert into bays (id, org_id, name)
select b.id, o.org_id, b.name
from org o
cross join bay_seed b
on conflict (id) do update set
  org_id = excluded.org_id,
  name = excluded.name;

with local_day as (
  select date_trunc('day', timezone('Europe/Vilnius', now())) as start_local
),
params as (
  select
    '550e8400-e29b-41d4-a716-446655440000'::uuid as org_id,
    '550e8400-e29b-41d4-a716-446655440010'::uuid as customer_id,
    '550e8400-e29b-41d4-a716-446655440020'::uuid as vehicle_id,
    '550e8400-e29b-41d4-a716-446655440100'::uuid as created_by,
    '550e8400-e29b-41d4-a716-446655441000'::uuid as tech_greta,
    '550e8400-e29b-41d4-a716-446655441001'::uuid as tech_mindaugas,
    '550e8400-e29b-41d4-a716-446655441002'::uuid as tech_electrics,
    '550e8400-e29b-41d4-a716-446655441100'::uuid as bay_a,
    '550e8400-e29b-41d4-a716-446655441101'::uuid as bay_b
),
slots as (
  select
    ld.start_local,
    (ld.start_local + interval '08 hours') as slot_8,
    (ld.start_local + interval '09 hours 30 minutes') as slot_930,
    (ld.start_local + interval '11 hours') as slot_11,
    (ld.start_local + interval '12 hours 30 minutes') as slot_1230,
    (ld.start_local + interval '14 hours') as slot_14,
    (ld.start_local + interval '15 hours 30 minutes') as slot_1530
  from local_day ld
)
insert into appointments (
  id,
  org_id,
  title,
  customer_id,
  vehicle_id,
  technician_id,
  bay_id,
  status,
  starts_at,
  ends_at,
  notes,
  priority,
  created_by
)
select * from (
  select
    '550e8400-e29b-41d4-a716-446655441200'::uuid,
    p.org_id,
    'Scheduled - 60k km service',
    p.customer_id,
    p.vehicle_id,
    p.tech_greta,
    p.bay_a,
    'scheduled',
    (s.slot_8 at time zone 'Europe/Vilnius'),
    (s.slot_930 at time zone 'Europe/Vilnius'),
    'Full inspection before noon window.',
    1,
    p.created_by
  from params p
  cross join slots s
  union all
  select
    '550e8400-e29b-41d4-a716-446655441201'::uuid,
    p.org_id,
    'Waiting on brake parts',
    p.customer_id,
    p.vehicle_id,
    p.tech_mindaugas,
    p.bay_b,
    'waiting_parts',
    (s.slot_11 at time zone 'Europe/Vilnius'),
    (s.slot_1230 at time zone 'Europe/Vilnius'),
    'Paused while ordering OEM brake kit.',
    2,
    p.created_by
  from params p
  cross join slots s
  union all
  select
    '550e8400-e29b-41d4-a716-446655441202'::uuid,
    p.org_id,
    'Electrical diagnostics follow-up',
    p.customer_id,
    p.vehicle_id,
    p.tech_electrics,
    p.bay_a,
    'in_progress',
    (s.slot_14 at time zone 'Europe/Vilnius'),
    (s.slot_1530 at time zone 'Europe/Vilnius'),
    'Customer requested update call at completion.',
    0,
    p.created_by
  from params p
  cross join slots s
) as seed(id, org_id, title, customer_id, vehicle_id, technician_id, bay_id, status, starts_at, ends_at, notes, priority, created_by)
on conflict (id) do update set
  org_id = excluded.org_id,
  title = excluded.title,
  technician_id = excluded.technician_id,
  bay_id = excluded.bay_id,
  status = excluded.status,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  notes = excluded.notes,
  priority = excluded.priority,
  created_by = excluded.created_by;
