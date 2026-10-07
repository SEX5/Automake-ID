-- Reusable photo paper inventory for IDPrint Studio
-- Run this in the Supabase SQL editor (one time).
-- Safe to run on a project that already has other tables.

create table if not exists public.saved_papers (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  paper_size text not null,
  size_id text not null,
  custom_width_mm numeric null,
  custom_height_mm numeric null,
  is_combo boolean not null default false,
  margin_mm numeric not null default 12,
  spacing_mm numeric not null default 4,
  blocks jsonb not null default '[]'::jsonb,
  cut_cells text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_papers_owner_idx
  on public.saved_papers (owner_id);

alter table public.saved_papers enable row level security;

-- v1: permissive policies for the anon key (personal print-shop use).
-- Rows are still scoped per browser via owner_id in the app.
-- Add Supabase Auth later for real multi-user isolation.
drop policy if exists "anon all" on public.saved_papers;
create policy "anon all" on public.saved_papers
  for all
  using (true)
  with check (true);
