-- Run once in Supabase → SQL Editor → New query → paste → Run.
create table if not exists catalogue_state (
  id text primary key,
  data jsonb,
  updated_at timestamptz default now()
);
alter table catalogue_state enable row level security;
-- Simple team policy: anyone holding your project's anon key can read/write the catalogue.
-- Fine for a private team tool. Do not publish the anon key on a public website you don't control.
create policy "team read"  on catalogue_state for select using (true);
create policy "team write" on catalogue_state for insert with check (true);
create policy "team update" on catalogue_state for update using (true);
