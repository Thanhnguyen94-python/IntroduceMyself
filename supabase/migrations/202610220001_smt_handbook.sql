-- Sổ tay tra cứu SMT (/tai-lieu-ky-thuat/so-tay + Admin → Sổ tay SMT).
-- Chỉ server (service role) đọc/ghi: bật RLS, không tạo policy cho anon.
-- Khi bảng còn trống, web hiển thị bộ mục mặc định trong code (src/lib/handbook/seed);
-- Admin bấm "Nạp bộ mặc định" để chép vào bảng rồi chỉnh sửa.

create table if not exists public.smt_handbook (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null default 'quality',
  sort_order integer not null default 0,
  status text not null default 'published' check (status in ('published', 'draft')),
  -- Tiêu đề, ký hiệu, tóm tắt, công thức, ngưỡng, nội dung Markdown, tag... (xem src/lib/handbook/types.ts)
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_smt_handbook_category on public.smt_handbook(category, sort_order);

alter table public.smt_handbook enable row level security;
revoke all on public.smt_handbook from anon, authenticated;
