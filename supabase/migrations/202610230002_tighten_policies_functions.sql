-- Xử lý cảnh báo Security Advisor của Supabase (2026-10-21).
-- App chỉ truy cập DB từ server bằng service role (bỏ qua RLS và có mọi quyền),
-- nên thu hồi quyền của anon/authenticated không ảnh hưởng chức năng.

-- 1) site_visibility: 2 policy "always true" (tạo tay trên Dashboard) cho phép
--    anon (ai có anon key) bật/tắt các trang. Bỏ policy, chỉ server được ghi.
drop policy if exists "Enable update/insert for site_visibility" on public.site_visibility;
drop policy if exists "Admin update site_visibility" on public.site_visibility;
alter table public.site_visibility enable row level security;
revoke all on public.site_visibility from anon, authenticated;

-- 2) verify_admin_login: anon gọi được qua /rest/v1/rpc -> dò mật khẩu admin
--    vượt qua giới hạn đăng nhập của app. App không gọi RPC này từ trình duyệt.
revoke execute on function public.verify_admin_login(text, text) from public, anon, authenticated;
grant execute on function public.verify_admin_login(text, text) to service_role;

-- 3) rls_auto_enable: hàm event trigger do Supabase tạo (tự bật RLS cho bảng mới),
--    không cần gọi qua API. Thu hồi quyền gọi; trigger vẫn chạy bình thường.
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
