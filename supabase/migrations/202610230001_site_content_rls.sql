-- Fix cảnh báo Supabase "rls_disabled_in_public": bảng site_content chưa bật RLS
-- nên ai có anon key (công khai trong trình duyệt) đều đọc/sửa/xoá được.
-- App chỉ truy cập site_content từ server bằng service role (bỏ qua RLS),
-- nên bật RLS + không tạo policy cho anon không ảnh hưởng chức năng.

alter table public.site_content enable row level security;
revoke all on public.site_content from anon, authenticated;

-- Chốt chặn: bật RLS cho mọi bảng còn sót trong schema public
-- (kể cả bảng tạo tay trên Dashboard), tránh lặp lại cảnh báo này.
do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and rowsecurity = false
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
