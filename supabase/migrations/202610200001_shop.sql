-- Cửa hàng /shop: sản phẩm + đơn hàng.
-- Chỉ server (service role) đọc/ghi: bật RLS, không tạo policy cho anon.
-- Cài đặt cửa hàng lưu ở bảng site_content (config_key = 'shop_settings'), không cần bảng mới.

create table if not exists public.shop_products (
  id text primary key,
  slug text not null unique,
  status text not null default 'draft' check (status in ('published', 'draft', 'hidden')),
  category text not null default '',
  sort_order integer not null default 0,
  price integer not null default 0 check (price >= 0),
  compare_at_price integer not null default 0 check (compare_at_price >= 0),
  stock integer,
  featured boolean not null default false,
  sold_count integer not null default 0,
  -- Tên, mô tả, ảnh/video, thông số, tuỳ chọn, tag... (xem src/lib/shop/types.ts)
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shop_products_status_sort on public.shop_products(status, sort_order);

create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  -- sha256 của mã bí mật trả cho khách lúc đặt hàng (để xem lại đơn trên máy đó)
  access_token text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'packing', 'shipping', 'completed', 'cancelled', 'returned')),
  customer_name text not null,
  phone text not null,
  email text not null default '',
  address text not null default '',
  note text not null default '',
  items jsonb not null default '[]'::jsonb,
  subtotal integer not null default 0,
  shipping_fee integer not null default 0,
  total integer not null default 0,
  payment_method text not null default 'cod' check (payment_method in ('cod', 'bank')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  admin_note text not null default '',
  history jsonb not null default '[]'::jsonb,
  stock_applied boolean not null default false,
  visitor_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_shop_orders_created on public.shop_orders(created_at desc);
create index if not exists idx_shop_orders_status on public.shop_orders(status);

alter table public.shop_products enable row level security;
alter table public.shop_orders enable row level security;
revoke all on public.shop_products from anon, authenticated;
revoke all on public.shop_orders from anon, authenticated;

-- Chuyển sản phẩm từ trang "Sản phẩm trưng bày" cũ sang cửa hàng mới (chạy lại không bị trùng).
do $$
begin
  if to_regclass('public.showcase_products') is not null then
    insert into public.shop_products (id, slug, status, category, sort_order, price, compare_at_price, stock, data)
    select
      p.id,
      p.id,
      'published',
      p.category,
      p.sort_order,
      p.sale_price,
      p.old_price,
      null,
      jsonb_build_object(
        'name', jsonb_build_object('vi', p.name_vi, 'en', p.name_en),
        'summary', jsonb_build_object('vi', p.description_vi, 'en', p.description_en),
        'description', jsonb_build_object('vi', '', 'en', ''),
        'stockNote', jsonb_build_object('vi', p.stock_text_vi, 'en', p.stock_text_en),
        'media', (
          select coalesce(jsonb_agg(jsonb_build_object('url', m.url)), '[]'::jsonb)
          from (
            select p.image as url where p.image <> ''
            union all
            select g.value from jsonb_array_elements_text(coalesce(p.gallery, '[]'::jsonb)) as g(value) where g.value <> ''
          ) m
        ),
        'tags', coalesce(p.tags, '[]'::jsonb),
        'options', '[]'::jsonb,
        'specs', '[]'::jsonb,
        'badge', jsonb_build_object('vi', '', 'en', '')
      )
    from public.showcase_products p
    on conflict (id) do nothing;
  end if;
end $$;
