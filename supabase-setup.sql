-- ═══════════════════════════════════════════════════
--  QR SHIFT — Supabase Database Schema
--  Run this in your Supabase SQL Editor to set up tables
-- ═══════════════════════════════════════════════════

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ── Users table (extends Supabase auth.users) ──
-- Supabase Auth handles user creation via Google OAuth.
-- This table stores app-specific profile data.
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text unique not null,
  created_at timestamptz default now()
);

-- Auto-create profile when a new user signs up via Google
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── QR Codes table ──
create table public.qr_codes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  slug text unique not null,
  label text not null,
  destination_url text not null,
  redirect_url text not null,
  scans integer default 0,
  routing_rules jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Link History table ──
create table public.link_history (
  id uuid default uuid_generate_v4() primary key,
  qr_code_id uuid references public.qr_codes(id) on delete cascade not null,
  previous_url text not null,
  changed_at timestamptz default now()
);

-- ── Scan Analytics table (optional, for detailed tracking) ──
create table public.scan_events (
  id uuid default uuid_generate_v4() primary key,
  qr_code_id uuid references public.qr_codes(id) on delete cascade not null,
  resolved_url text not null,
  routing_rule_matched text,
  scanned_at timestamptz default now(),
  user_agent text,
  ip_country text
);

-- ── Row Level Security ──
-- Users can only see/edit their own QR codes
alter table public.profiles enable row level security;
alter table public.qr_codes enable row level security;
alter table public.link_history enable row level security;
alter table public.scan_events enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- QR Codes: users can CRUD their own codes
create policy "Users can view own QR codes"
  on public.qr_codes for select
  using (auth.uid() = user_id);

create policy "Users can create QR codes"
  on public.qr_codes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own QR codes"
  on public.qr_codes for update
  using (auth.uid() = user_id);

create policy "Users can delete own QR codes"
  on public.qr_codes for delete
  using (auth.uid() = user_id);

-- QR Codes: anyone can read (needed for redirect lookups by slug)
create policy "Anyone can read QR codes by slug"
  on public.qr_codes for select
  using (true);

-- Link History: users can view history of their own QR codes
create policy "Users can view own link history"
  on public.link_history for select
  using (
    exists (
      select 1 from public.qr_codes
      where qr_codes.id = link_history.qr_code_id
      and qr_codes.user_id = auth.uid()
    )
  );

create policy "Users can insert link history for own QR codes"
  on public.link_history for insert
  with check (
    exists (
      select 1 from public.qr_codes
      where qr_codes.id = link_history.qr_code_id
      and qr_codes.user_id = auth.uid()
    )
  );

-- Scan events: anyone can insert (public endpoint for tracking)
create policy "Anyone can insert scan events"
  on public.scan_events for insert
  with check (true);

create policy "Users can view scan events for own QR codes"
  on public.scan_events for select
  using (
    exists (
      select 1 from public.qr_codes
      where qr_codes.id = scan_events.qr_code_id
      and qr_codes.user_id = auth.uid()
    )
  );

-- ── Indexes ──
create index idx_qr_codes_slug on public.qr_codes(slug);
create index idx_qr_codes_user_id on public.qr_codes(user_id);
create index idx_link_history_qr_code_id on public.link_history(qr_code_id);
create index idx_scan_events_qr_code_id on public.scan_events(qr_code_id);

-- ── Increment scan count function (called from edge function or client) ──
create or replace function public.increment_scan(qr_slug text)
returns text as $$
declare
  dest_url text;
  qr_id uuid;
begin
  select id, destination_url into qr_id, dest_url
  from public.qr_codes
  where slug = qr_slug;

  if qr_id is null then
    return null;
  end if;

  update public.qr_codes
  set scans = scans + 1
  where id = qr_id;

  return dest_url;
end;
$$ language plpgsql security definer;
