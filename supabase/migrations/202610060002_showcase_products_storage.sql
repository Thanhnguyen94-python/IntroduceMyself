-- Showcase products table + storage buckets
-- Run via: supabase db push

create table if not exists public.showcase_products (
  id text primary key,
  category text not null check (category in ('3d', 'display')),
  name_vi text not null default '',
  name_en text not null default '',
  description_vi text not null default '',
  description_en text not null default '',
  image text not null default '',
  gallery jsonb not null default '[]'::jsonb,
  old_price integer not null default 0,
  sale_price integer not null default 0,
  stock_text_vi text not null default '',
  stock_text_en text not null default '',
  tags jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_showcase_products_sort_order
  on public.showcase_products(sort_order);

insert into storage.buckets (id, name, public)
values
  ('images', 'images', true),
  ('videos', 'videos', true),
  ('docs', 'docs', true)
on conflict (id) do nothing;
