-- Hệ thống Mẫu báo cáo & Quản lý dữ liệu SMT (/tai-lieu-ky-thuat/smt-reports + /admin/smt).
-- Chỉ server (service role) đọc/ghi: bật RLS, không tạo policy cho anon.
-- Dữ liệu nhà máy là dữ liệu nội bộ: trang công khai chỉ hiện dữ liệu demo, hoặc số liệu tổng hợp
-- (khi admin chọn "live"), 8D / 4M chỉ hiện bản ghi có is_public = true.
-- Cài đặt (line, trạm, danh mục lỗi, mục tiêu KPI) lưu ở site_content (config_key = 'smt_settings').

-- 1) Nhật ký sản xuất theo ca: nguồn cho OEE, FPY, DPMO.
create table if not exists public.smt_production_logs (
  id uuid primary key default gen_random_uuid(),
  log_date date not null,
  shift text not null default '',
  line text not null,
  model text not null default '',
  work_order text not null default '',
  planned_min numeric not null default 0 check (planned_min >= 0),
  downtime_min numeric not null default 0 check (downtime_min >= 0),
  downtime_reason text not null default '',
  ideal_ct_sec numeric not null default 0 check (ideal_ct_sec >= 0),
  total_qty integer not null default 0 check (total_qty >= 0),
  good_qty integer not null default 0 check (good_qty >= 0),
  -- số cơ hội lỗi / board (thường = số mối hàn) để tính DPMO
  opportunities integer not null default 0 check (opportunities >= 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_smt_prod_date on public.smt_production_logs(log_date desc);
create index if not exists idx_smt_prod_line_date on public.smt_production_logs(line, log_date);

-- 2) Nhật ký lỗi: nguồn cho Pareto, PPM, phân tích theo công đoạn / trạm phát hiện.
create table if not exists public.smt_defect_logs (
  id uuid primary key default gen_random_uuid(),
  log_date date not null,
  shift text not null default '',
  line text not null,
  model text not null default '',
  defect_code text not null,
  process text not null default 'other',
  detected_by text not null default 'AOI',
  location text not null default '',
  part_no text not null default '',
  qty integer not null default 1 check (qty >= 0),
  root_cause text not null default '',
  action text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_smt_defect_date on public.smt_defect_logs(log_date desc);
create index if not exists idx_smt_defect_line_date on public.smt_defect_logs(line, log_date);

-- 3) Đo cycle time từng trạm: nguồn cho Line Balance / Bottleneck.
create table if not exists public.smt_cycle_times (
  id uuid primary key default gen_random_uuid(),
  measured_on date not null,
  line text not null,
  model text not null default '',
  station text not null,
  cycle_time_sec numeric not null check (cycle_time_sec >= 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_smt_ct_line on public.smt_cycle_times(line, model, measured_on desc);

-- 4) Báo cáo 8D (AIAG): phần đầu là cột thường để lọc, D0-D8 nằm trong content (jsonb).
create table if not exists public.smt_8d_reports (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  status text not null default 'open' check (status in ('open', 'containment', 'analysis', 'action', 'verification', 'closed')),
  severity text not null default 'major' check (severity in ('minor', 'major', 'critical')),
  customer text not null default '',
  line text not null default '',
  model text not null default '',
  defect_code text not null default '',
  owner text not null default '',
  opened_on date not null default current_date,
  due_on date,
  closed_on date,
  -- { d0, d1: team, d2: 5W2H, d3: containment, d4: fishbone + 5 why, d5..d8 } (xem src/lib/smt/types.ts)
  content jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_smt_8d_opened on public.smt_8d_reports(opened_on desc);

-- 5) Quản lý thay đổi 4M1E.
create table if not exists public.smt_4m_changes (
  id uuid primary key default gen_random_uuid(),
  code text not null default '',
  change_date date not null,
  category text not null check (category in ('man', 'machine', 'material', 'method', 'environment')),
  line text not null default '',
  model text not null default '',
  item text not null,
  before_state text not null default '',
  after_state text not null default '',
  reason text not null default '',
  risk text not null default 'low' check (risk in ('low', 'medium', 'high')),
  validation text not null default '',
  result text not null default 'pending' check (result in ('pending', 'ok', 'ng')),
  status text not null default 'planned' check (status in ('planned', 'implemented', 'verified', 'rejected')),
  owner text not null default '',
  approved_by text not null default '',
  is_public boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_smt_4m_date on public.smt_4m_changes(change_date desc);

-- 6) Feeder / Nozzle (danh mục thiết bị) + 7) nhật ký sử dụng, PM, sửa chữa.
create table if not exists public.smt_assets (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null check (asset_type in ('feeder', 'nozzle')),
  code text not null unique,
  spec text not null default '',
  machine text not null default '',
  status text not null default 'active' check (status in ('active', 'maintenance', 'retired')),
  last_pm_on date,
  pm_interval_days integer not null default 90 check (pm_interval_days > 0),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smt_asset_logs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.smt_assets(id) on delete cascade,
  log_date date not null,
  event text not null default 'usage' check (event in ('usage', 'pm', 'repair', 'calibration', 'inspection')),
  picks integer not null default 0 check (picks >= 0),
  mispicks integer not null default 0 check (mispicks >= 0),
  result text not null default 'ok' check (result in ('ok', 'ng')),
  technician text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_smt_asset_logs_asset on public.smt_asset_logs(asset_id, log_date desc);
create index if not exists idx_smt_asset_logs_date on public.smt_asset_logs(log_date desc);

do $$
declare t text;
begin
  foreach t in array array['smt_production_logs', 'smt_defect_logs', 'smt_cycle_times', 'smt_8d_reports', 'smt_4m_changes', 'smt_assets', 'smt_asset_logs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
