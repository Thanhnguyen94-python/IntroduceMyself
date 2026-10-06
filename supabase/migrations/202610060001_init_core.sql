-- Core bootstrap schema for future migration from JSON to Supabase
-- Created: 2026-10-06

create extension if not exists "pgcrypto";

create table if not exists public.site_visibility (
  page_key text primary key,
  is_enabled boolean not null default true,
  maintenance_message_vi text not null default 'đang bảo trì nâng cấp, vui lòng quay lại sau',
  maintenance_message_en text not null default 'This page is under maintenance and upgrade. Please come back later.',
  updated_at timestamptz not null default now()
);

insert into public.site_visibility(page_key, is_enabled)
values
  ('overview', true),
  ('journey', true),
  ('projects', true),
  ('showcase', true),
  ('docs', true)
on conflict (page_key) do nothing;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  unique(bucket, path)
);

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  display_name text,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_media_assets_bucket on public.media_assets(bucket);
create index if not exists idx_media_assets_created_at on public.media_assets(created_at desc);

-- RLS placeholders (enable when app uses Supabase Auth directly)
-- alter table public.site_visibility enable row level security;
-- alter table public.media_assets enable row level security;
-- alter table public.admin_profiles enable row level security;
