-- Personal Gym Tracker — Supabase schema + Row Level Security.
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL -> New query).
--
-- Each app entity maps to a thin table shaped (user_id, id, data jsonb,
-- updated_at). The `data` column holds the exact app object, so the existing
-- client data model is preserved as-is. RLS guarantees a user can only read or
-- write rows where user_id = auth.uid() — one user can never see another's data.

-- Logged-in users access tables through the `authenticated` role. RLS (below)
-- still restricts every row to its owner; these grants are the separate
-- table-privilege layer that newer Supabase projects don't auto-apply to
-- tables created via raw SQL. The app never queries as `anon` (all data access
-- is behind login), so only `authenticated` is granted.
grant usage on schema public to authenticated;

do $$
declare
  t text;
  tables text[] := array[
    'exercises',
    'workout_templates',
    'template_exercises',
    'workout_sessions',
    'set_entries',
    'body_metrics',
    'readiness_logs',
    'personal_notes',
    'settings',
    'ai_reports',
    'swap_groups',
    'volume_targets',
    'progression_rules'
  ];
begin
  foreach t in array tables loop
    -- Table: composite PK (user_id, id) lets seeded slugs (e.g. 'incline-db-press')
    -- coexist across users.
    execute format(
      'create table if not exists public.%I (
         user_id uuid not null references auth.users(id) on delete cascade,
         id text not null,
         data jsonb not null,
         updated_at timestamptz not null default now(),
         primary key (user_id, id)
       )', t);

    -- Table privileges for logged-in users (RLS still gates rows per-user).
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated', t);

    -- Enforce ownership.
    execute format('alter table public.%I enable row level security', t);

    -- Single policy covering select/insert/update/delete for the owner only.
    execute format('drop policy if exists %I on public.%I', t || '_owner', t);
    execute format(
      'create policy %I on public.%I
         for all
         using (auth.uid() = user_id)
         with check (auth.uid() = user_id)', t || '_owner', t);

    -- Helpful index for per-user reads (PK already covers most, but explicit
    -- user_id index helps count/head queries).
    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_idx', t);
  end loop;
end $$;
