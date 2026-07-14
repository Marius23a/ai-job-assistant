-- =====================================================================
-- AI Job Assistant — core schema
-- Postgres / Supabase. Run with: supabase db push  (or paste in SQL editor)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type subscription_plan   as enum ('free', 'pro');
create type subscription_status as enum ('trialing','active','past_due','canceled','incomplete','incomplete_expired','unpaid');
create type application_status  as enum ('wishlist','applied','interview','offer','rejected');
create type generation_type     as enum ('cv_optimization','cover_letter','interview_feedback','resume_analysis','advisor_chat');
create type writing_tone        as enum ('professional','friendly','formal');

-- ---------- Shared helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- =====================================================================
-- profiles  (1:1 with auth.users — holds the cached current plan)
-- =====================================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  plan        subscription_plan not null default 'free',  -- synced from Stripe webhook
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- subscriptions  (source of truth synced from Stripe; written by service role only)
-- =====================================================================
create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  plan                   subscription_plan not null default 'free',
  status                 subscription_status,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index idx_subscriptions_user on public.subscriptions(user_id);
create trigger trg_subscriptions_updated
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- =====================================================================
-- cvs  (uploaded résumés; file in storage bucket 'cvs', text extracted on upload)
-- =====================================================================
create table public.cvs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null default 'My CV',
  file_path      text,            -- '<user_id>/<uuid>-<filename>' in bucket 'cvs'
  extracted_text text,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_cvs_user on public.cvs(user_id);
create trigger trg_cvs_updated
  before update on public.cvs
  for each row execute function public.set_updated_at();

-- =====================================================================
-- job_descriptions  (saved JDs)
-- =====================================================================
create table public.job_descriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text,
  company    text,
  content    text not null,
  created_at timestamptz not null default now()
);
create index idx_jd_user on public.job_descriptions(user_id);

-- =====================================================================
-- applications  (job tracker / kanban)
-- =====================================================================
create table public.applications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  company     text not null,
  role        text not null,
  status      application_status not null default 'wishlist',
  salary      text,
  location    text,
  url         text,
  notes       text,
  deadline    date,
  cv_id       uuid references public.cvs(id) on delete set null,
  sort_order  double precision not null default 0,   -- ordering within a column
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_apps_user_status on public.applications(user_id, status);
create trigger trg_apps_updated
  before update on public.applications
  for each row execute function public.set_updated_at();

-- =====================================================================
-- ai_generations  (history of every AI output, for the "History" view)
-- =====================================================================
create table public.ai_generations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        generation_type not null,
  cv_id       uuid references public.cvs(id) on delete set null,
  input       jsonb not null default '{}',
  output      jsonb not null default '{}',
  model       text,
  tokens_used int,
  created_at  timestamptz not null default now()
);
create index idx_gen_user_created on public.ai_generations(user_id, created_at desc);

-- =====================================================================
-- usage_daily  (the freemium meter — one row per user per UTC day)
-- =====================================================================
create table public.usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default (now() at time zone 'utc')::date,
  count   int  not null default 0,
  primary key (user_id, day)
);

-- Atomic check-and-increment. Returns whether the action is allowed.
-- Pro = unlimited; Free = 3/day. Called from the API before each AI action.
create or replace function public.check_and_increment_usage(p_user_id uuid)
returns table (allowed boolean, used int, daily_limit int, plan subscription_plan)
language plpgsql security definer set search_path = public as $$
declare
  v_plan  subscription_plan;
  v_limit int;
  v_day   date := (now() at time zone 'utc')::date;
  v_count int;
begin
  select profiles.plan into v_plan from profiles where id = p_user_id;
  v_plan  := coalesce(v_plan, 'free');
  v_limit := case when v_plan = 'pro' then 2147483647 else 3 end;

  insert into usage_daily(user_id, day, count)
  values (p_user_id, v_day, 0)
  on conflict (user_id, day) do nothing;

  -- lock the row so concurrent requests can't both slip past the limit
  select usage_daily.count into v_count
  from usage_daily where user_id = p_user_id and day = v_day
  for update;

  if v_count >= v_limit then
    return query select false, v_count, v_limit, v_plan;
    return;
  end if;

  update usage_daily set count = count + 1
  where user_id = p_user_id and day = v_day
  returning count into v_count;

  return query select true, v_count, v_limit, v_plan;
end; $$;

-- =====================================================================
-- Row-Level Security — users only ever touch their own rows
-- =====================================================================
alter table public.profiles         enable row level security;
alter table public.subscriptions    enable row level security;
alter table public.cvs              enable row level security;
alter table public.job_descriptions enable row level security;
alter table public.applications     enable row level security;
alter table public.ai_generations   enable row level security;
alter table public.usage_daily      enable row level security;

-- profiles: read & update your own
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- full owner access on user-owned content
create policy "cvs_own"  on public.cvs              for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "jds_own"  on public.job_descriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "apps_own" on public.applications     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gens_own" on public.ai_generations   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- subscriptions & usage are READ-ONLY to the user.
-- Writes happen via the service role (Stripe webhook) or the SECURITY DEFINER
-- usage function above — both bypass RLS.
create policy "subs_select_own"  on public.subscriptions for select using (auth.uid() = user_id);
create policy "usage_select_own" on public.usage_daily   for select using (auth.uid() = user_id);
