-- ============================================================
-- Timeline OS — Complete database setup for a FRESH Supabase project
-- ------------------------------------------------------------
-- Run ONCE in the new project's SQL Editor (Dashboard → SQL Editor → New query).
-- Idempotent: safe to re-run. Creates every table, index, function,
-- trigger, and RLS policy the app needs. Default tags are seeded by the
-- app itself on first login, so nothing to insert here.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Generic updated_at trigger function
-- ------------------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- TABLES
-- ============================================================

-- users (mirrors auth.users; populated by the signup trigger below)
create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- tags (tag_id is a TEXT slug like 'work'; id is the UUID events reference)
create table if not exists public.tags (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  tag_id       text,
  name         text not null,
  icon_name    text,
  context      text,
  color        text,
  bg_color     text,
  text_color   text,
  border_color text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_tags_user on public.tags(user_id);

-- events (soft delete via `deleted`; recurrence + parent linkage)
create table if not exists public.events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  title               text not null,
  description         text default '',
  location            text default '',
  tag_id              uuid references public.tags(id),
  context             text,
  start_time          timestamptz not null,
  end_time            timestamptz not null,
  deleted             boolean default false,
  deleted_at          timestamptz,
  recurrence_pattern  text default 'none',
  recurrence_end_date timestamptz,
  parent_event_id     uuid references public.events(id) on delete cascade,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index if not exists idx_events_user_start        on public.events(user_id, start_time);
create index if not exists events_parent_event_id_idx   on public.events(parent_event_id);
create index if not exists events_recurrence_pattern_idx on public.events(recurrence_pattern);

-- user_preferences
create table if not exists public.user_preferences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  preferences jsonb default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id)
);

-- goals (focus mode)
create table if not exists public.goals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text,
  completed  boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- timers (focus mode)
create table if not exists public.timers (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  duration   integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- subscriptions (one per user; auto-created free on signup)
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users(id) on delete cascade,
  plan                   text not null default 'free'   check (plan in ('free','pro')),
  status                 text not null default 'active' check (status in ('active','trialing','past_due','canceled','incomplete')),
  trial_ends_at          timestamptz,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean default false,
  stripe_customer_id     text,
  stripe_subscription_id text,
  stripe_price_id        text,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);
create index if not exists idx_subscriptions_user_id             on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer     on public.subscriptions(stripe_customer_id);
create index if not exists idx_subscriptions_stripe_subscription on public.subscriptions(stripe_subscription_id);

-- telemetry_habits
create table if not exists public.telemetry_habits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  display_order integer not null default 0,
  active        boolean not null default true,
  habit_type    text default 'build' check (habit_type in ('build','eliminate')),
  created_at    timestamptz default now()
);
create index if not exists idx_telemetry_habits_user on public.telemetry_habits(user_id, active, display_order);

-- telemetry_days
create table if not exists public.telemetry_days (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  date             date not null,
  mood_score       integer check (mood_score between 0 and 10),
  note             text default '',
  memorable_moment text default '',
  mood_emoji       text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (user_id, date)
);
create index if not exists idx_telemetry_days_user_date on public.telemetry_days(user_id, date desc);

-- telemetry_completions
create table if not exists public.telemetry_completions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  habit_id   uuid not null references public.telemetry_habits(id) on delete cascade,
  completed  boolean not null default false,
  created_at timestamptz default now(),
  unique (user_id, date, habit_id)
);
create index if not exists idx_telemetry_completions_user_date on public.telemetry_completions(user_id, date);
create index if not exists idx_telemetry_completions_habit     on public.telemetry_completions(habit_id);

-- telemetry_month_summaries
create table if not exists public.telemetry_month_summaries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  year               integer not null,
  month              integer not null check (month between 1 and 12),
  memorable_moments  text default '',
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  unique (user_id, year, month)
);

-- life_metrics (flexible key/value: sleep, weight, workouts, productivity...)
create table if not exists public.life_metrics (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  recorded_at  timestamptz not null default now(),
  metric_type  text not null check (metric_type in ('manual','auto')),
  metric_name  text not null,
  metric_value numeric,
  metric_data  jsonb default '{}',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists idx_life_metrics_user_date on public.life_metrics(user_id, recorded_at);
create index if not exists idx_life_metrics_type      on public.life_metrics(metric_type);

-- ============================================================
-- updated_at triggers (tables that have an updated_at column)
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'users','tags','events','user_preferences','goals','timers',
    'subscriptions','telemetry_days','telemetry_month_summaries','life_metrics'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.update_updated_at_column()', t);
  end loop;
end$$;

-- ============================================================
-- Signup automation: create the users row + a free subscription
-- (SECURITY DEFINER so it can write past RLS on insert)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security — every table is user-scoped by auth.uid()
-- (the service role key bypasses RLS, used by webhooks + keep-alive)
-- ============================================================

-- Enable RLS + clear any existing owner policy on all user tables
do $$
declare t text;
begin
  foreach t in array array[
    'users','tags','events','user_preferences','goals','timers','subscriptions',
    'telemetry_habits','telemetry_days','telemetry_completions',
    'telemetry_month_summaries','life_metrics'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_all on public.%I', t);
  end loop;
end$$;

-- users: owner keyed on id
create policy owner_all on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- everything else: owner keyed on user_id
do $$
declare t text;
begin
  foreach t in array array[
    'tags','events','user_preferences','goals','timers','subscriptions',
    'telemetry_habits','telemetry_days','telemetry_completions',
    'telemetry_month_summaries','life_metrics'
  ] loop
    execute format('create policy owner_all on public.%I
                    for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end$$;

-- ============================================================
-- Done. Next: configure Auth providers (Google) + URL settings
-- in the Dashboard, then set the frontend env vars.
-- ============================================================
