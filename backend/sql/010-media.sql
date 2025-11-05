-- Vehicle and work order media tables & policies

-- Ensure private buckets exist
insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('work-order-photos', 'work-order-photos', false)
on conflict (id) do nothing;

-- Vehicle media table
create table if not exists vehicle_media (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  vehicle_id uuid not null references vehicles(id) on delete cascade,
  kind text not null default 'front',
  storage_path text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- Extend existing structure
alter table vehicle_media
  alter column kind set default 'front';

alter table vehicle_media
  add column if not exists caption text;

alter table vehicle_media
  add column if not exists sort_order int not null default 0;

alter table vehicle_media
  add column if not exists created_by uuid references profiles(id);

alter table vehicle_media
  add column if not exists created_at timestamptz not null default now();

alter table vehicle_media
  add constraint vehicle_media_kind_check
  check (kind in ('hero','front','rear','interior','damage'));

create index if not exists idx_vehicle_media_vehicle_sort
  on vehicle_media (vehicle_id, sort_order, created_at);

create index if not exists idx_vehicle_media_org
  on vehicle_media (org_id);

alter table vehicle_media enable row level security;

drop policy if exists "vehicle_media_select" on vehicle_media;
drop policy if exists "vehicle_media_write" on vehicle_media;
drop policy if exists "Vehicle media read" on vehicle_media;
drop policy if exists "Vehicle media write" on vehicle_media;

create policy "Vehicle media read" on vehicle_media
  for select
  using (org_id = get_user_org_id());

create policy "Vehicle media insert" on vehicle_media
  for insert
  with check (
    org_id = get_user_org_id()
    and get_user_role() in ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN')
  );

create policy "Vehicle media update" on vehicle_media
  for update
  using (
    org_id = get_user_org_id()
    and get_user_role() in ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN')
  )
  with check (
    org_id = get_user_org_id()
    and get_user_role() in ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN')
  );

create policy "Vehicle media delete" on vehicle_media
  for delete
  using (
    org_id = get_user_org_id()
    and get_user_role() in ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN')
  );

-- Work order media table
create table if not exists work_order_media (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  work_order_id uuid not null references work_orders(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  category text not null default 'issue',
  storage_path text not null,
  caption text,
  gps jsonb,
  created_at timestamptz not null default now()
);

alter table work_order_media
  add column if not exists caption text;

alter table work_order_media
  add column if not exists gps jsonb;

alter table work_order_media
  add column if not exists uploaded_by uuid references profiles(id);

update work_order_media wom
set uploaded_by = wo.created_by
from work_orders wo
where wom.work_order_id = wo.id
  and wom.uploaded_by is null;

alter table work_order_media
  alter column uploaded_by set not null;

alter table work_order_media
  add column if not exists category text not null default 'issue';

alter table work_order_media
  add column if not exists created_at timestamptz not null default now();

alter table work_order_media
  add constraint work_order_media_category_check
  check (category in ('before','after','issue','damage','progress'));

create index if not exists idx_work_order_media_work_order
  on work_order_media (work_order_id, created_at desc);

create index if not exists idx_work_order_media_category
  on work_order_media (work_order_id, category, created_at desc);

create index if not exists idx_work_order_media_org
  on work_order_media (org_id);

alter table work_order_media enable row level security;

drop policy if exists "work_order_media_read" on work_order_media;
drop policy if exists "work_order_media_write" on work_order_media;

drop policy if exists "Work order media read" on work_order_media;
drop policy if exists "Work order media write" on work_order_media;

create policy "Work order media read" on work_order_media
  for select
  using (org_id = get_user_org_id());

create policy "Work order media insert" on work_order_media
  for insert
  with check (
    org_id = get_user_org_id()
    and get_user_role() in ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN')
  );

create policy "Work order media update" on work_order_media
  for update
  using (
    org_id = get_user_org_id()
    and get_user_role() in ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN')
  )
  with check (
    org_id = get_user_org_id()
    and get_user_role() in ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN')
  );

create policy "Work order media delete" on work_order_media
  for delete
  using (
    org_id = get_user_org_id()
    and get_user_role() in ('OWNER','MANAGER','SERVICE_ADVISOR','TECHNICIAN')
  );

-- Storage policies referencing relational data
create policy if not exists "vehicle_media_read"
  on storage.objects for select
  using (
    bucket_id = 'vehicle-photos'
    and (
      auth.role() = 'service_role'
      or exists (
        select 1 from vehicle_media vm
        where vm.storage_path = storage.objects.name
          and vm.org_id = get_user_org_id()
      )
    )
  );

create policy if not exists "vehicle_media_write"
  on storage.objects for insert
  with check (bucket_id = 'vehicle-photos' and auth.role() = 'service_role');

create policy if not exists "vehicle_media_delete"
  on storage.objects for delete
  using (bucket_id = 'vehicle-photos' and auth.role() = 'service_role');

create policy if not exists "work_order_media_read"
  on storage.objects for select
  using (
    bucket_id = 'work-order-photos'
    and (
      auth.role() = 'service_role'
      or exists (
        select 1 from work_order_media wom
        where wom.storage_path = storage.objects.name
          and wom.org_id = get_user_org_id()
      )
    )
  );

create policy if not exists "work_order_media_write"
  on storage.objects for insert
  with check (bucket_id = 'work-order-photos' and auth.role() = 'service_role');

create policy if not exists "work_order_media_delete"
  on storage.objects for delete
  using (bucket_id = 'work-order-photos' and auth.role() = 'service_role');
