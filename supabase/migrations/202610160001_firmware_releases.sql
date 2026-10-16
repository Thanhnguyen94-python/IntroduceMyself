-- Firmware releases cho robot xiaozhi (bread-compact-wifi, ...)
-- - app_path: file xiaozhi.bin (OTA qua WebUI robot / API latest)
-- - merged_path: file merged (bootloader + partition + app, offset 0) cho trang nạp online (ESP Web Tools)
-- File nằm trong bucket public "firmware"; Next.js API dùng service role để ghi.
-- Date: 2026-10-16

begin;

create table if not exists public.firmware_releases (
  id uuid primary key default gen_random_uuid(),
  board text not null default 'bread-compact-wifi',
  chip text not null default 'ESP32-S3',
  version text not null,
  channel text not null default 'stable' check (channel in ('stable', 'beta')),
  title text not null default '',
  notes text not null default '',
  hardware text not null default '',
  app_path text not null default '',
  app_size bigint not null default 0,
  app_sha256 text not null default '',
  merged_path text not null default '',
  merged_size bigint not null default 0,
  wiring_image text not null default '',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (board, channel, version)
);

create index if not exists idx_firmware_releases_board_channel
  on public.firmware_releases(board, channel, is_published, created_at desc);

-- Chỉ server (service role) đọc/ghi bảng; public đọc qua API Next.js.
alter table public.firmware_releases enable row level security;

insert into storage.buckets (id, name, public, file_size_limit)
values ('firmware', 'firmware', true, 16777216)
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit;

commit;
