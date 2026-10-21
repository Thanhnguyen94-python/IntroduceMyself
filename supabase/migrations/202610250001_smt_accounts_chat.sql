-- SMT Workspace: tài khoản Trợ lý / Kỹ sư, xin quyền xoá, nhóm chat, báo cáo tự động.
-- Admin vẫn là tài khoản admin_profiles hiện có (quyền cao nhất). Tài khoản ở đây chỉ dùng trong /smt,
-- không đăng nhập được /admin, shop, firmware...
-- Chỉ server (service role) đọc/ghi: bật RLS, không tạo policy cho anon / authenticated.

-- ===== Tài khoản =====
create table if not exists public.smt_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null default '',
  password_hash text not null,
  role text not null check (role in ('assistant', 'engineer')),
  engineer_id uuid references public.smt_engineers(id) on delete set null,
  active boolean not null default true,
  must_change_password boolean not null default true,
  -- Tăng lên khi khoá / đặt lại mật khẩu -> mọi phiên đăng nhập cũ hết hiệu lực ngay.
  session_version integer not null default 1,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===== Xin quyền xoá (Trợ lý) =====
-- target: {kind: "dataset" | "task" | "engineer" | "chat", dataset?, ids: [...], label, demo}
-- scope khi duyệt: once = chỉ lần này, day = đến hết ngày, month = 30 ngày.
create table if not exists public.smt_delete_requests (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.smt_accounts(id) on delete cascade,
  requester text not null default '',
  target jsonb not null default '{}'::jsonb,
  reason text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  scope text check (scope in ('once', 'day', 'month')),
  expires_at timestamptz,
  decided_by text not null default '',
  decided_at timestamptz,
  executed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_smt_delete_requests_status on public.smt_delete_requests(status, created_at desc);
create index if not exists idx_smt_delete_requests_account on public.smt_delete_requests(account_id, expires_at desc);

-- ===== Nhóm chat =====
create table if not exists public.smt_chat_channels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null default 'topic' check (kind in ('general', 'line', 'topic')),
  line text not null default '',
  description text not null default '',
  sort integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smt_chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.smt_chat_channels(id) on delete cascade,
  author_role text not null default '',
  author_id text not null default '',
  author_name text not null default '',
  body text not null default '',
  -- Đánh dấu "Vấn đề" để theo dõi đến khi giải quyết; là nguồn cho báo cáo tự động.
  is_issue boolean not null default false,
  resolved boolean not null default false,
  line text not null default '',
  defect_code text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  reply_to uuid,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_smt_chat_messages_channel on public.smt_chat_messages(channel_id, created_at desc);
create index if not exists idx_smt_chat_messages_created on public.smt_chat_messages(created_at desc);
create index if not exists idx_smt_chat_messages_issue on public.smt_chat_messages(is_issue, resolved);

-- ===== Báo cáo tự động (theo lịch admin / trợ lý đặt) =====
create table if not exists public.smt_auto_reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('daily', 'weekly')),
  slot text not null,                 -- mốc lịch, vd "2026-10-21 17:30"
  period_from timestamptz not null,
  period_to timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  ai_summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, slot)
);
create index if not exists idx_smt_auto_reports_created on public.smt_auto_reports(created_at desc);

-- ===== Bổ sung cột =====
-- Việc kỹ sư tự đề xuất: approved = false cho tới khi admin / trợ lý duyệt (chưa tính điểm).
alter table public.smt_tasks add column if not exists approved boolean not null default true;
alter table public.smt_tasks add column if not exists created_by text not null default '';

-- Ai nhập / sửa dòng dữ liệu (truy vết khi nhập sai).
do $$
declare t text;
begin
  foreach t in array array['smt_production_logs', 'smt_defect_logs', 'smt_cycle_times', 'smt_8d_reports', 'smt_4m_changes', 'smt_assets', 'smt_asset_logs']
  loop
    execute format('alter table public.%I add column if not exists created_by text not null default %L', t, '');
    execute format('alter table public.%I add column if not exists updated_by text not null default %L', t, '');
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['smt_accounts', 'smt_delete_requests', 'smt_chat_channels', 'smt_chat_messages', 'smt_auto_reports']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;
