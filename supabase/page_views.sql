-- ===========================================================================
-- Page analytics table for the StemCells Protocol admin dashboard.
-- Run this once in Supabase → SQL Editor.
-- Records one row per page visit: which page, country, and time on page.
-- Insert is public (anon + logged-in); reading is admin-only via RLS.
-- ===========================================================================

create table if not exists public.page_views (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  session_id   text,
  path         text,
  page         text,          -- friendly label: Therapies, Simulator, ...
  country      text,          -- 2-letter code, e.g. IN, US
  duration_sec integer,       -- seconds spent on the page
  referrer     text
);

alter table public.page_views enable row level security;

-- Anyone can log a page view (browser side).
drop policy if exists page_views_insert on public.page_views;
create policy page_views_insert
  on public.page_views for insert
  to anon, authenticated
  with check (true);

-- Only the admin account can read the analytics.
drop policy if exists page_views_select_admin on public.page_views;
create policy page_views_select_admin
  on public.page_views for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'dr.sanjay@stemcellsprotocol.com');

-- API-role grants (needed for SQL-created tables, otherwise "API Disabled").
grant insert on table public.page_views to anon, authenticated;
grant select on table public.page_views to authenticated;

-- Helpful index for the dashboard's date-range queries.
create index if not exists page_views_created_at_idx
  on public.page_views (created_at desc);

-- Reload PostgREST's schema cache so the API picks up the new table.
notify pgrst, 'reload schema';
