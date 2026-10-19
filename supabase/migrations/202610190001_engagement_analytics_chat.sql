-- Thống kê truy cập, số lần nạp firmware, chat với admin, hỏi đáp dưới tài liệu.
-- Date: 2026-10-19
-- Tất cả bảng bật RLS và KHÔNG có policy: anon key không đọc/ghi được.
-- Chỉ server (service role, qua API Next.js có kiểm tra/giới hạn) truy cập.

begin;

-- 1) Lượt truy cập (1 dòng = 1 lần xem trang). Không lưu IP gốc.
create table if not exists public.analytics_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,          -- id ngẫu nhiên lưu ở trình duyệt khách (không phải dữ liệu định danh)
  session_id text not null,
  path text not null,
  hub text,
  referrer_host text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  country text,
  region text,
  city text,
  device text,                       -- desktop | mobile | tablet
  browser text,
  os text,
  language text,
  screen text,
  timezone text,
  is_new_visitor boolean not null default false,
  duration_sec integer not null default 0,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists idx_analytics_visits_created_at on public.analytics_visits(created_at desc);
create index if not exists idx_analytics_visits_last_seen on public.analytics_visits(last_seen_at desc);
create index if not exists idx_analytics_visits_visitor on public.analytics_visits(visitor_id);

-- 2) Sự kiện nạp firmware (mỗi bản phát hành / manifest tĩnh)
create table if not exists public.firmware_flash_events (
  id uuid primary key default gen_random_uuid(),
  release_key text not null,         -- id bản phát hành, hoặc "static:<hub>" cho manifest tĩnh
  board text,
  version text,
  hub text,
  event text not null check (event in ('manifest', 'started', 'success', 'error')),
  erase boolean,
  error_message text,
  visitor_id text,
  country text,
  browser text,
  os text,
  created_at timestamptz not null default now()
);
create index if not exists idx_flash_events_release on public.firmware_flash_events(release_key, event);
create index if not exists idx_flash_events_created_at on public.firmware_flash_events(created_at desc);

-- 3) Chat khách <-> admin
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  access_token text not null,        -- bí mật của khách (lưu ở trình duyệt khách) để đọc cuộc trò chuyện
  visitor_id text,
  name text not null,
  contact text,
  page text,
  hub text,
  country text,
  device text,
  status text not null default 'open' check (status in ('open', 'closed')),
  unread_admin integer not null default 0,
  unread_visitor integer not null default 0,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  created_at timestamptz not null default now()
);
create index if not exists idx_chat_conversations_last on public.chat_conversations(last_message_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender text not null check (sender in ('visitor', 'admin')),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_chat_messages_conversation on public.chat_messages(conversation_id, created_at);

-- 4) Hỏi đáp dưới mỗi bài tài liệu Project Hub (admin duyệt trước khi hiện)
create table if not exists public.doc_comments (
  id uuid primary key default gen_random_uuid(),
  hub text not null,
  doc_path text not null,
  parent_id uuid references public.doc_comments(id) on delete cascade,
  author_name text not null,
  contact text,                      -- không bao giờ hiển thị công khai
  body text not null,
  is_admin boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  visitor_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_doc_comments_doc on public.doc_comments(hub, doc_path, status);
create index if not exists idx_doc_comments_created_at on public.doc_comments(created_at desc);

alter table public.analytics_visits enable row level security;
alter table public.firmware_flash_events enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.doc_comments enable row level security;

commit;
