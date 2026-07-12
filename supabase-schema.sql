-- ============================================================================
-- Ledger — Supabase schema for optional cloud sync
-- Run this in the Supabase SQL Editor of a fresh project.
-- ============================================================================

-- One table per Dexie store. Every row belongs to exactly one user.
-- Sync metadata lives on every row: created_at, updated_at, deleted_at.
-- The record body is stored as JSONB for schema flexibility across devices.

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
    id text not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    primary key (user_id, id)
);

create table if not exists public.categories (
    id text not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    primary key (user_id, id)
);

create table if not exists public.budgets (
    id text not null,             -- month key e.g. '2026-02'
    user_id uuid not null references auth.users(id) on delete cascade,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    primary key (user_id, id)
);

create table if not exists public.expenses (
    id text not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    primary key (user_id, id)
);

create table if not exists public.reminders (
    id text not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    primary key (user_id, id)
);

create table if not exists public.savings_funds (
    id text not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    primary key (user_id, id)
);

create table if not exists public.monthly_snapshots (
    id text not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    data jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    deleted_at timestamptz,
    primary key (user_id, id)
);

-- ----------------------------------------------------------------------------
-- Indexes for delta-sync (fetch rows newer than lastSyncAt)
-- ----------------------------------------------------------------------------
create index if not exists idx_settings_updated_at         on public.settings(user_id, updated_at desc);
create index if not exists idx_categories_updated_at       on public.categories(user_id, updated_at desc);
create index if not exists idx_budgets_updated_at          on public.budgets(user_id, updated_at desc);
create index if not exists idx_expenses_updated_at         on public.expenses(user_id, updated_at desc);
create index if not exists idx_reminders_updated_at        on public.reminders(user_id, updated_at desc);
create index if not exists idx_savings_funds_updated_at    on public.savings_funds(user_id, updated_at desc);
create index if not exists idx_monthly_snapshots_updated_at on public.monthly_snapshots(user_id, updated_at desc);

-- ----------------------------------------------------------------------------
-- Row Level Security — a user can only see and write their own rows.
-- ----------------------------------------------------------------------------
alter table public.settings          enable row level security;
alter table public.categories        enable row level security;
alter table public.budgets           enable row level security;
alter table public.expenses          enable row level security;
alter table public.reminders         enable row level security;
alter table public.savings_funds     enable row level security;
alter table public.monthly_snapshots enable row level security;

-- Reusable macro-style policy set per table
do $$
declare
    t text;
begin
    foreach t in array array['settings','categories','budgets','expenses','reminders','savings_funds','monthly_snapshots']
    loop
        execute format('drop policy if exists "%1$s_select_own" on public.%1$s', t);
        execute format('drop policy if exists "%1$s_insert_own" on public.%1$s', t);
        execute format('drop policy if exists "%1$s_update_own" on public.%1$s', t);
        execute format('drop policy if exists "%1$s_delete_own" on public.%1$s', t);

        execute format('create policy "%1$s_select_own" on public.%1$s for select to authenticated using (user_id = auth.uid())', t);
        execute format('create policy "%1$s_insert_own" on public.%1$s for insert to authenticated with check (user_id = auth.uid())', t);
        execute format('create policy "%1$s_update_own" on public.%1$s for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
        execute format('create policy "%1$s_delete_own" on public.%1$s for delete to authenticated using (user_id = auth.uid())', t);
    end loop;
end
$$;

-- ----------------------------------------------------------------------------
-- Auto-update updated_at on every row write
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

do $$
declare
    t text;
begin
    foreach t in array array['settings','categories','budgets','expenses','reminders','savings_funds','monthly_snapshots']
    loop
        execute format('drop trigger if exists trg_%1$s_updated_at on public.%1$s', t);
        execute format('create trigger trg_%1$s_updated_at before update on public.%1$s for each row execute function public.set_updated_at()', t);
    end loop;
end
$$;
