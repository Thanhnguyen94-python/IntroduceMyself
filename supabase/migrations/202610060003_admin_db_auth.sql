-- Admin login via DB credentials (Supabase)
-- Adds username/password_hash and RPC verifier used by Next.js API

create extension if not exists "pgcrypto";

alter table public.admin_profiles
  add column if not exists username text unique,
  add column if not exists password_hash text;

-- Keep lookups fast by username/email and active flag
create index if not exists idx_admin_profiles_username on public.admin_profiles(username);
create index if not exists idx_admin_profiles_email on public.admin_profiles(email);
create index if not exists idx_admin_profiles_is_active on public.admin_profiles(is_active);

-- Không seed tài khoản/mật khẩu mặc định trong migration (tránh lộ mật khẩu trong mã nguồn).
-- Tạo hoặc đặt lại mật khẩu admin bằng script (đọc khoá từ .env.local, hỏi mật khẩu ẩn):
--   npm run admin:set-password -- <username> [email]

create or replace function public.verify_admin_login(p_identifier text, p_password text)
returns table (
  id uuid,
  username text,
  email text,
  display_name text,
  role text
)
language sql
security definer
set search_path = public
as $$
  select
    ap.id,
    ap.username,
    ap.email,
    ap.display_name,
    ap.role
  from public.admin_profiles ap
  where ap.is_active = true
    and (
      lower(coalesce(ap.username, '')) = lower(coalesce(p_identifier, ''))
      or lower(coalesce(ap.email, '')) = lower(coalesce(p_identifier, ''))
    )
    and coalesce(ap.password_hash, '') <> ''
    and ap.password_hash = extensions.crypt(coalesce(p_password, ''), ap.password_hash)
  limit 1;
$$;

grant execute on function public.verify_admin_login(text, text) to anon, authenticated, service_role;
