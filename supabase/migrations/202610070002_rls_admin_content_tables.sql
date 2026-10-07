-- RLS for dynamic content tables (career_journey, projects, showcase_products)
-- Lock read/write to admin role via Supabase Auth user mapping
-- Date: 2026-10-07

begin;

-- 1) Map Supabase Auth user -> admin profile
alter table public.admin_profiles
  add column if not exists auth_user_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_profiles_auth_user_id_fkey'
  ) then
    alter table public.admin_profiles
      add constraint admin_profiles_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id)
      on delete set null;
  end if;
end
$$;

create unique index if not exists idx_admin_profiles_auth_user_id
  on public.admin_profiles(auth_user_id)
  where auth_user_id is not null;

-- 2) Helper function used by RLS policies
create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.is_active = true
      and lower(coalesce(ap.role, '')) = 'admin'
      and ap.auth_user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin_user() from public;
grant execute on function public.is_admin_user() to authenticated, service_role;

-- 3) Enable RLS on content tables
alter table public.career_journey enable row level security;
alter table public.projects enable row level security;
alter table public.showcase_products enable row level security;

-- 4) Reset grants and grant only what is needed (RLS still applies)
revoke all on public.career_journey from anon, authenticated;
revoke all on public.projects from anon, authenticated;
revoke all on public.showcase_products from anon, authenticated;

grant select, insert, update, delete on public.career_journey to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.showcase_products to authenticated;

-- 5) Detailed policies (authenticated users must be admin)
drop policy if exists career_journey_admin_select on public.career_journey;
drop policy if exists career_journey_admin_insert on public.career_journey;
drop policy if exists career_journey_admin_update on public.career_journey;
drop policy if exists career_journey_admin_delete on public.career_journey;

create policy career_journey_admin_select
  on public.career_journey
  for select
  to authenticated
  using (public.is_admin_user());

create policy career_journey_admin_insert
  on public.career_journey
  for insert
  to authenticated
  with check (public.is_admin_user());

create policy career_journey_admin_update
  on public.career_journey
  for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy career_journey_admin_delete
  on public.career_journey
  for delete
  to authenticated
  using (public.is_admin_user());


drop policy if exists projects_admin_select on public.projects;
drop policy if exists projects_admin_insert on public.projects;
drop policy if exists projects_admin_update on public.projects;
drop policy if exists projects_admin_delete on public.projects;

create policy projects_admin_select
  on public.projects
  for select
  to authenticated
  using (public.is_admin_user());

create policy projects_admin_insert
  on public.projects
  for insert
  to authenticated
  with check (public.is_admin_user());

create policy projects_admin_update
  on public.projects
  for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy projects_admin_delete
  on public.projects
  for delete
  to authenticated
  using (public.is_admin_user());


drop policy if exists showcase_products_admin_select on public.showcase_products;
drop policy if exists showcase_products_admin_insert on public.showcase_products;
drop policy if exists showcase_products_admin_update on public.showcase_products;
drop policy if exists showcase_products_admin_delete on public.showcase_products;

create policy showcase_products_admin_select
  on public.showcase_products
  for select
  to authenticated
  using (public.is_admin_user());

create policy showcase_products_admin_insert
  on public.showcase_products
  for insert
  to authenticated
  with check (public.is_admin_user());

create policy showcase_products_admin_update
  on public.showcase_products
  for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy showcase_products_admin_delete
  on public.showcase_products
  for delete
  to authenticated
  using (public.is_admin_user());

commit;
