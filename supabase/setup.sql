-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- (Safe to run again: everything uses "if not exists".)

-- 1) One row per product (so several people can save at the same time without overwriting each other)
create table if not exists catalogue_products (
  id text primary key,
  sku text,
  data jsonb not null,
  updated_at timestamptz default now(),
  updated_by text
);
create index if not exists catalogue_products_sku on catalogue_products (sku);

-- 2) Shared settings: brands, categories, materials, colours, SKU rule, export preferences
create table if not exists catalogue_settings (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now(),
  updated_by text
);

-- 3) Edit history / audit log
create table if not exists catalogue_history (
  id bigserial primary key,
  at timestamptz default now(),
  who text,
  action text,
  sku text,
  detail jsonb
);
create index if not exists catalogue_history_at on catalogue_history (at desc);

-- 4) Team policy: anyone holding the project's anon key can read/write (private team tool).
alter table catalogue_products enable row level security;
alter table catalogue_settings enable row level security;
alter table catalogue_history enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='catalogue_products' and policyname='team all') then
    create policy "team all" on catalogue_products for all using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename='catalogue_settings' and policyname='team all') then
    create policy "team all" on catalogue_settings for all using (true) with check (true); end if;
  if not exists (select 1 from pg_policies where tablename='catalogue_history' and policyname='team all') then
    create policy "team all" on catalogue_history for all using (true) with check (true); end if;
end $$;

-- 5) Live updates between open browsers
do $$ begin
  begin alter publication supabase_realtime add table catalogue_products; exception when others then null; end;
  begin alter publication supabase_realtime add table catalogue_settings; exception when others then null; end;
  begin alter publication supabase_realtime add table catalogue_history; exception when others then null; end;
end $$;

-- 6) Old single-row table from the first version (kept; the app migrates its data automatically)
create table if not exists catalogue_state (id text primary key, data jsonb, updated_at timestamptz default now());
alter table catalogue_state enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='catalogue_state' and policyname='team all') then
    create policy "team all" on catalogue_state for all using (true) with check (true); end if;
end $$;

-- ============================================================
-- v4: LOGIN. Only invited users (Authentication → Users) who are also
-- listed in catalogue_users may read/write. Run this whole file again.
-- ============================================================
create table if not exists catalogue_users (
  email text primary key,
  role text default 'editor',
  added_at timestamptz default now()
);
alter table catalogue_users enable row level security;
insert into catalogue_users (email, role) values ('wonderlane.global@gmail.com', 'owner') on conflict (email) do nothing;

-- helper: is the logged-in user on the allow-list?
create or replace function public.is_catalogue_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from catalogue_users where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function public.is_catalogue_user() to authenticated, anon;

-- replace the open "team all" policies with login-only policies
do $$ declare t text; begin
  foreach t in array array['catalogue_products','catalogue_settings','catalogue_history','catalogue_state'] loop
    execute format('drop policy if exists "team all" on %I', t);
    execute format('drop policy if exists "login all" on %I', t);
    execute format('create policy "login all" on %I for all to authenticated using (public.is_catalogue_user()) with check (public.is_catalogue_user())', t);
  end loop;
end $$;
drop policy if exists "users read" on catalogue_users;
create policy "users read" on catalogue_users for select to authenticated using (public.is_catalogue_user());
drop policy if exists "owner manage" on catalogue_users;
create policy "owner manage" on catalogue_users for all to authenticated
  using (exists (select 1 from catalogue_users u where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email','')) and u.role = 'owner'))
  with check (exists (select 1 from catalogue_users u where lower(u.email) = lower(coalesce(auth.jwt() ->> 'email','')) and u.role = 'owner'));
