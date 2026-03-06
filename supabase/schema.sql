-- ═══════════════════════════════════════════════════
--  QR SHIFT — Production Database Schema
--  Run in Supabase SQL Editor
--  Matches types in src/types/database.ts
-- ═══════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- ── Enums ──
create type user_role as enum ('owner', 'admin', 'member');
create type rule_type as enum ('time_range', 'day_of_week', 'device', 'geo_fence', 'geo_ip', 'schedule', 'scan_count', 'custom');
create type device_type as enum ('mobile', 'desktop', 'tablet', 'robot', 'drone');
create type scan_source as enum ('qr_scan', 'short_link', 'embed', 'api_simulate');
create type change_source as enum ('user', 'api', 'agent', 'schedule');
create type automation_job_type as enum ('rotate_playlist', 'rss_sync', 'calendar_sync', 'webhook');
create type plan_tier as enum ('free', 'pro', 'agent', 'enterprise');
create type billing_cycle as enum ('monthly', 'annual');
create type agent_type as enum ('mcp', 'rest', 'webhook');

-- ── Profiles (extends Supabase auth.users) ──
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  display_name text,
  org_id uuid,
  role user_role not null default 'member',
  created_at timestamptz not null default now()
);

-- ── Organizations ──
create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Add FK from profiles to organizations (deferred to avoid circular dep)
alter table public.profiles
  add constraint fk_profiles_org foreign key (org_id) references public.organizations(id) on delete set null;

-- ── QR Codes ──
create table public.qr_codes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete set null,
  slug text unique not null,
  custom_slug boolean not null default false,
  label text not null,
  destination_url text not null,
  short_url text not null,
  is_active boolean not null default true,
  scan_count integer not null default 0,
  click_count integer not null default 0,
  tags text[] not null default '{}',
  qr_style jsonb,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Routing Rules ──
create table public.routing_rules (
  id uuid primary key default uuid_generate_v4(),
  qr_code_id uuid not null references public.qr_codes(id) on delete cascade,
  priority integer not null default 0,
  rule_type rule_type not null,
  conditions jsonb not null default '{}'::jsonb,
  destination_url text not null,
  payload jsonb,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Geo-Fences (PostGIS) ──
create table public.geo_fences (
  id uuid primary key default uuid_generate_v4(),
  rule_id uuid not null references public.routing_rules(id) on delete cascade,
  center geography(Point, 4326) not null,
  radius_meters integer not null default 1000,
  polygon geography(Polygon, 4326),
  place_label text,
  place_id text,
  created_at timestamptz not null default now()
);

-- ── Scan Events (append-only analytics) ──
create table public.scan_events (
  id uuid primary key default uuid_generate_v4(),
  qr_code_id uuid not null references public.qr_codes(id) on delete cascade,
  source scan_source not null default 'qr_scan',
  scanned_at timestamptz not null default now(),
  user_agent text,
  device_type device_type,
  ip_hash text,
  location geography(Point, 4326),
  country text,
  region text,
  city text,
  referrer text,
  rule_matched uuid references public.routing_rules(id) on delete set null,
  destination_url text not null,
  custom_signals jsonb
);

-- ── Link History (append-only audit log) ──
create table public.link_history (
  id uuid primary key default uuid_generate_v4(),
  qr_code_id uuid not null references public.qr_codes(id) on delete cascade,
  previous_url text not null,
  new_url text not null,
  changed_by change_source not null default 'user',
  changed_at timestamptz not null default now(),
  agent_context jsonb
);

-- ── Automation Jobs ──
create table public.automation_jobs (
  id uuid primary key default uuid_generate_v4(),
  qr_code_id uuid not null references public.qr_codes(id) on delete cascade,
  job_type automation_job_type not null,
  config jsonb not null default '{}'::jsonb,
  cron_expression text,
  last_run_at timestamptz,
  next_run_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Billing Accounts ──
create table public.billing_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  plan plan_tier not null default 'free',
  billing_cycle billing_cycle not null default 'monthly',
  metered_usage jsonb not null default '{}'::jsonb,
  usage_limits jsonb not null default '{}'::jsonb,
  overage_rate jsonb,
  is_active boolean not null default true,
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- ── API Keys ──
create table public.api_keys (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  billing_account_id uuid references public.billing_accounts(id) on delete set null,
  key_hash text not null,
  key_prefix text not null,
  label text not null,
  scopes text[] not null default '{}',
  rate_limit integer not null default 60,
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Agent Registrations ──
create table public.agent_registrations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  api_key_id uuid references public.api_keys(id) on delete set null,
  agent_name text not null,
  agent_type agent_type not null default 'rest',
  description text,
  allowed_origins text[],
  auto_provision boolean not null default false,
  spending_cap_cents integer,
  total_codes_created integer not null default 0,
  total_api_calls integer not null default 0,
  created_at timestamptz not null default now()
);

-- ── Usage Events ──
create table public.usage_events (
  id uuid primary key default uuid_generate_v4(),
  billing_account_id uuid not null references public.billing_accounts(id) on delete cascade,
  event_type text not null,
  quantity integer not null default 1,
  metadata jsonb,
  recorded_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════
--  Auto-create profile + billing on signup
-- ═══════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_profile_id uuid;
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')
  );

  insert into public.billing_accounts (user_id, plan)
  values (new.id, 'free');

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ═══════════════════════════════════════════════════
--  Auto-update updated_at on qr_codes
-- ═══════════════════════════════════════════════════
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger qr_codes_updated_at
  before update on public.qr_codes
  for each row execute function public.update_updated_at();

-- ═══════════════════════════════════════════════════
--  Increment scan count (called from redirect engine)
-- ═══════════════════════════════════════════════════
create or replace function public.increment_scan(
  p_slug text,
  p_source scan_source default 'qr_scan'
)
returns table(destination_url text, qr_id uuid) as $$
begin
  return query
  update public.qr_codes
  set scan_count = scan_count + case when p_source = 'qr_scan' then 1 else 0 end,
      click_count = click_count + case when p_source = 'short_link' then 1 else 0 end
  where slug = p_slug and is_active = true
  returning qr_codes.destination_url, qr_codes.id as qr_id;
end;
$$ language plpgsql security definer;

-- ═══════════════════════════════════════════════════
--  Row Level Security
-- ═══════════════════════════════════════════════════
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.qr_codes enable row level security;
alter table public.routing_rules enable row level security;
alter table public.geo_fences enable row level security;
alter table public.scan_events enable row level security;
alter table public.link_history enable row level security;
alter table public.automation_jobs enable row level security;
alter table public.billing_accounts enable row level security;
alter table public.api_keys enable row level security;
alter table public.agent_registrations enable row level security;
alter table public.usage_events enable row level security;

-- Profiles
create policy "users_read_own_profile" on public.profiles
  for select using (auth.uid() = id);
create policy "users_update_own_profile" on public.profiles
  for update using (auth.uid() = id);

-- Organizations
create policy "org_members_read" on public.organizations
  for select using (
    exists (select 1 from public.profiles where profiles.org_id = organizations.id and profiles.id = auth.uid())
    or owner_id = auth.uid()
  );
create policy "org_owners_manage" on public.organizations
  for all using (owner_id = auth.uid());

-- QR Codes: owners CRUD their own; anyone can read active codes (for redirect)
create policy "qr_owner_all" on public.qr_codes
  for all using (user_id = auth.uid());
create policy "qr_public_read_active" on public.qr_codes
  for select using (is_active = true);

-- Routing Rules: inherit from QR code ownership; public read for redirect
create policy "rules_owner_all" on public.routing_rules
  for all using (
    exists (select 1 from public.qr_codes where qr_codes.id = routing_rules.qr_code_id and qr_codes.user_id = auth.uid())
  );
create policy "rules_public_read" on public.routing_rules
  for select using (
    exists (select 1 from public.qr_codes where qr_codes.id = routing_rules.qr_code_id and qr_codes.is_active = true)
  );

-- Geo-fences: inherit from routing rule ownership
create policy "geo_owner_all" on public.geo_fences
  for all using (
    exists (
      select 1 from public.routing_rules r
      join public.qr_codes q on q.id = r.qr_code_id
      where r.id = geo_fences.rule_id and q.user_id = auth.uid()
    )
  );
create policy "geo_public_read" on public.geo_fences
  for select using (
    exists (
      select 1 from public.routing_rules r
      join public.qr_codes q on q.id = r.qr_code_id
      where r.id = geo_fences.rule_id and q.is_active = true
    )
  );

-- Scan Events: anyone can insert (redirect engine); owner can read
create policy "scans_public_insert" on public.scan_events
  for insert with check (true);
create policy "scans_owner_read" on public.scan_events
  for select using (
    exists (select 1 from public.qr_codes where qr_codes.id = scan_events.qr_code_id and qr_codes.user_id = auth.uid())
  );

-- Link History: owner read + insert
create policy "history_owner_read" on public.link_history
  for select using (
    exists (select 1 from public.qr_codes where qr_codes.id = link_history.qr_code_id and qr_codes.user_id = auth.uid())
  );
create policy "history_owner_insert" on public.link_history
  for insert with check (
    exists (select 1 from public.qr_codes where qr_codes.id = link_history.qr_code_id and qr_codes.user_id = auth.uid())
  );

-- Automation Jobs: owner manage
create policy "automations_owner_all" on public.automation_jobs
  for all using (
    exists (select 1 from public.qr_codes where qr_codes.id = automation_jobs.qr_code_id and qr_codes.user_id = auth.uid())
  );

-- Billing: owner only
create policy "billing_owner_all" on public.billing_accounts
  for all using (user_id = auth.uid());

-- API Keys: owner only
create policy "keys_owner_all" on public.api_keys
  for all using (user_id = auth.uid());

-- Agent Registrations: owner only
create policy "agents_owner_all" on public.agent_registrations
  for all using (user_id = auth.uid());

-- Usage Events: billing account owner
create policy "usage_owner_read" on public.usage_events
  for select using (
    exists (select 1 from public.billing_accounts where billing_accounts.id = usage_events.billing_account_id and billing_accounts.user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════
--  Indexes
-- ═══════════════════════════════════════════════════
create index idx_qr_codes_slug on public.qr_codes(slug);
create index idx_qr_codes_user_id on public.qr_codes(user_id);
create index idx_qr_codes_org_id on public.qr_codes(org_id) where org_id is not null;
create index idx_qr_codes_active on public.qr_codes(is_active) where is_active = true;
create index idx_routing_rules_qr_code on public.routing_rules(qr_code_id);
create index idx_routing_rules_priority on public.routing_rules(qr_code_id, priority);
create index idx_geo_fences_rule on public.geo_fences(rule_id);
create index idx_geo_fences_center on public.geo_fences using gist(center);
create index idx_scan_events_qr_code on public.scan_events(qr_code_id);
create index idx_scan_events_time on public.scan_events(scanned_at desc);
create index idx_link_history_qr_code on public.link_history(qr_code_id);
create index idx_automation_jobs_qr_code on public.automation_jobs(qr_code_id);
create index idx_automation_jobs_next_run on public.automation_jobs(next_run_at) where is_active = true;
create index idx_api_keys_hash on public.api_keys(key_hash);
create index idx_api_keys_user on public.api_keys(user_id);
create index idx_usage_events_billing on public.usage_events(billing_account_id);
create index idx_usage_events_time on public.usage_events(recorded_at desc);
