-- SMT Workspace (/smt): dữ liệu DEMO tách riêng + Quản lý công việc đội kỹ sư.
--
-- 1) Mỗi bảng smt_* có cột is_demo. Dữ liệu thật = false (mặc định, dữ liệu cũ giữ nguyên).
--    Demo và thật nằm chung bảng nhưng mọi truy vấn của app đều lọc theo is_demo, nên
--    tạo / xoá / sửa dữ liệu demo không bao giờ chạm vào dữ liệu thật.
-- 2) Bảng mới: smt_engineers, smt_tasks, smt_task_updates (giao việc & đánh giá kỹ sư).
-- 3) 2 hàm chỉ service role gọi được: tổng hợp lỗi theo tháng, xem dung lượng bảng.
-- Chỉ server (service role) đọc/ghi: bật RLS, không tạo policy cho anon / authenticated.

do $$
declare t text;
begin
  foreach t in array array['smt_production_logs', 'smt_defect_logs', 'smt_cycle_times', 'smt_8d_reports', 'smt_4m_changes', 'smt_assets', 'smt_asset_logs']
  loop
    execute format('alter table public.%I add column if not exists is_demo boolean not null default false', t);
  end loop;
end $$;

create index if not exists idx_smt_prod_demo_date on public.smt_production_logs(is_demo, log_date);
create index if not exists idx_smt_defect_demo_date on public.smt_defect_logs(is_demo, log_date);
create index if not exists idx_smt_asset_logs_demo_date on public.smt_asset_logs(is_demo, log_date);

-- Mã thiết bị / mã 8D chỉ cần duy nhất trong cùng một "thế giới" (demo hoặc thật).
alter table public.smt_assets drop constraint if exists smt_assets_code_key;
create unique index if not exists uq_smt_assets_demo_code on public.smt_assets(is_demo, code);
alter table public.smt_8d_reports drop constraint if exists smt_8d_reports_code_key;
create unique index if not exists uq_smt_8d_demo_code on public.smt_8d_reports(is_demo, code);

-- ===== Đội ngũ kỹ sư =====
create table if not exists public.smt_engineers (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  role text not null default 'process' check (role in ('process', 'equipment', 'quality', 'npi', 'program', 'lead')),
  level text not null default 'mid' check (level in ('junior', 'mid', 'senior', 'lead')),
  lines text not null default '',              -- line phụ trách, cách nhau dấu phẩy: "L01,L02"
  capacity_h numeric not null default 40 check (capacity_h >= 0),   -- giờ làm việc cho dự án / tuần
  joined_on date,
  active boolean not null default true,
  note text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_smt_engineers_demo_code on public.smt_engineers(is_demo, code);

-- ===== Công việc =====
create table if not exists public.smt_tasks (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  description text not null default '',
  category text not null default 'other' check (category in ('8d', '4m', 'improvement', 'pm', 'npi', 'program', 'training', 'report', 'other')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  difficulty integer not null default 2 check (difficulty between 1 and 5),
  assignee_id uuid references public.smt_engineers(id) on delete set null,
  line text not null default '',
  ref_code text not null default '',           -- mã 8D / 4M / WO liên quan
  status text not null default 'todo' check (status in ('todo', 'doing', 'blocked', 'review', 'done', 'cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  assigned_on date not null default current_date,
  start_on date,
  due_on date,
  done_on date,
  estimate_h numeric not null default 0 check (estimate_h >= 0),
  actual_h numeric not null default 0 check (actual_h >= 0),
  quality_score integer check (quality_score between 1 and 5),   -- quản lý chấm khi nghiệm thu
  rework_count integer not null default 0 check (rework_count >= 0),  -- số lần trả lại làm lại
  follow_up_on date,                           -- ngày quản lý muốn hỏi lại tiến độ
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_smt_tasks_demo_code on public.smt_tasks(is_demo, code);
create index if not exists idx_smt_tasks_demo_status on public.smt_tasks(is_demo, status);
create index if not exists idx_smt_tasks_assignee on public.smt_tasks(assignee_id);

-- Nhật ký từng việc: cập nhật tiến độ, đổi trạng thái, nghiệm thu, trả lại.
create table if not exists public.smt_task_updates (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.smt_tasks(id) on delete cascade,
  at date not null default current_date,
  kind text not null default 'note' check (kind in ('note', 'status', 'progress', 'review', 'rework')),
  status text not null default '',
  progress integer check (progress between 0 and 100),
  hours numeric not null default 0 check (hours >= 0),
  author text not null default '',
  note text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_smt_task_updates_task on public.smt_task_updates(task_id, at desc);

do $$
declare t text;
begin
  foreach t in array array['smt_engineers', 'smt_tasks', 'smt_task_updates']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ===== Tổng hợp lỗi theo tháng (thay vì tải hàng chục nghìn dòng về server) =====
create or replace function public.smt_defect_summary(p_demo boolean, p_from date, p_to date)
returns table(line text, month text, defect_code text, process text, detected_by text, qty bigint)
language sql stable
set search_path = public
as $$
  select d.line, to_char(d.log_date, 'YYYY-MM'), d.defect_code, d.process, d.detected_by, sum(d.qty)::bigint
  from public.smt_defect_logs d
  where d.is_demo = p_demo and d.log_date between p_from and p_to
  group by 1, 2, 3, 4, 5
$$;

-- ===== Dung lượng database (Admin → SMT → Dữ liệu demo & dung lượng) =====
create or replace function public.db_table_sizes()
returns table(table_name text, row_estimate bigint, total_bytes bigint)
language sql stable
set search_path = public
as $$
  select c.relname::text, greatest(c.reltuples, 0)::bigint, pg_total_relation_size(c.oid)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
  union all
  select '__database__', 0, pg_database_size(current_database())
$$;

revoke execute on function public.smt_defect_summary(boolean, date, date) from public, anon, authenticated;
revoke execute on function public.db_table_sizes() from public, anon, authenticated;
grant execute on function public.smt_defect_summary(boolean, date, date) to service_role;
grant execute on function public.db_table_sizes() to service_role;
