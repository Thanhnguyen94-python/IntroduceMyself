# app - Route tầng giao diện

Web được chia thành **3 không gian** độc lập bằng Route Groups của Next.js App Router.
Tên trong ngoặc `( )` không xuất hiện trên URL, chỉ dùng để gắn layout riêng.

```
src/app/
├─ layout.tsx                  # Root: <html>, ThemeProvider, LanguageProvider (không có header)
├─ (portfolio)/                # 1) PORTFOLIO cho nhà tuyển dụng
│  ├─ layout.tsx               #    PortfolioHeader + Footer + FloatingContact
│  ├─ page.tsx                 #    "/"  trang chủ, section lấy từ CMS (home_layout)
│  ├─ tong-quan/ hanh-trinh/ du-an/[slug]/ san-pham-trung-bay/ tai-lieu-ky-thuat/ cv/
├─ (hub)/[hub]/                # 2) PROJECT HUB cho maker (vd /joy)
│  ├─ layout.tsx               #    HubHeader, kiểm tra hub tồn tại + bật/tắt (hub:<slug>)
│  ├─ page.tsx                 #    /joy           tổng quan dự án
│  ├─ docs/layout.tsx          #    sidebar tài liệu
│  ├─ docs/page.tsx            #    /joy/docs      mục lục
│  ├─ docs/[...slug]/page.tsx  #    /joy/docs/hardware/bom  bài viết Markdown
│  ├─ flash/page.tsx           #    /joy/flash     nạp firmware công khai (ESP Web Tools)
│  └─ updates/page.tsx         #    /joy/updates   changelog + bản phát hành
├─ admin/                      # 3) CMS
│  ├─ login/page.tsx           #    /admin/login (công khai)
│  └─ (protected)/             #    layout.tsx chặn toàn bộ nếu chưa đăng nhập
│     ├─ page.tsx              #    /admin          nội dung, bật/tắt trang, quyền riêng tư
│     ├─ layout/page.tsx       #    /admin/layout   kéo thả bố cục trang chủ
│     ├─ hubs/page.tsx         #    /admin/hubs     danh sách hub + tài liệu
│     ├─ firmware/ orders/ xiaozhi/
└─ api/                        # Route handler (giữ nguyên đường dẫn cũ)
```

## Quy tắc

- Route tĩnh luôn ưu tiên hơn `[hub]`, nên `/du-an`, `/admin`, `/cv`... không bị hub "nuốt".
  Không đặt slug hub trùng tên route tĩnh.
- Slug hub không tồn tại → `notFound()` (404).
- `/nap-firmware` (link cũ) được redirect sang `/joy/flash` trong `next.config.mjs`.
- `/api/firmware/latest` **không được đổi đường dẫn**: WebUI của robot gọi API này để kiểm tra OTA.
- Portfolio **không** chứa link nạp firmware hay Project Hub.

## Bật/tắt trang

`site_visibility` (Supabase) hoặc `src/content/pages/visibility.json`:

| Key | Áp dụng cho |
|---|---|
| `overview` | `/` và `/tong-quan` |
| `journey`, `projects`, `showcase`, `docs` | các trang Portfolio tương ứng |
| `hub:<slug>` | toàn bộ `/<slug>/**` (tự sinh cho mỗi hub) |

Key chưa từng lưu mặc định là **bật**.
