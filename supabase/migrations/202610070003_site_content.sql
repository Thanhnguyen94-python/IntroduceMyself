-- Site content storage for dynamic profile/overview config
-- Date: 2026-10-07

create table if not exists public.site_content (
  config_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
