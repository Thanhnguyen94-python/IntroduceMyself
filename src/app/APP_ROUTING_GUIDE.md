# app - Route tầng giao diện

Web được chia thành **5 không gian** độc lập bằng Route Groups của Next.js App Router.
Tên trong ngoặc `( )` không xuất hiện trên URL, chỉ dùng để gắn layout riêng.

```
src/app/
├─ layout.tsx                  # Root: <html>, ThemeProvider, LanguageProvider (không có header)
├─ (portfolio)/                # 1) PORTFOLIO cho nhà tuyển dụng
│  ├─ layout.tsx               #    PortfolioHeader + Footer + ChatWidget
│  ├─ page.tsx                 #    "/"  trang chủ, section lấy từ CMS (home_layout)
│  ├─ hanh-trinh/ du-an/[slug]/ tai-lieu-ky-thuat/ cv/   (/tong-quan cũ → redirect về "/")
│  └─ tai-lieu-ky-thuat/smt-reports/[report]/  # Mẫu báo cáo SMT (key "smt"): 8d, 4m1e, oee-line-balance,
│                                             #   yield-pareto, feeder-nozzle. ?blank=1 mẫu trống, &print=1 tự in
│  └─ tai-lieu-ky-thuat/so-tay/[slug]/         # Sổ tay tra cứu SMT (key "handbook")
├─ (hub)/[hub]/                # 2) PROJECT HUB cho maker (vd /joy)
│  ├─ layout.tsx               #    HubHeader, kiểm tra hub tồn tại + bật/tắt (hub:<slug>)
│  ├─ page.tsx                 #    /joy           tổng quan dự án
│  ├─ docs/layout.tsx          #    sidebar tài liệu
│  ├─ docs/page.tsx            #    /joy/docs      mục lục
│  ├─ docs/[...slug]/page.tsx  #    /joy/docs/hardware/bom  bài viết Markdown
│  ├─ flash/page.tsx           #    /joy/flash     nạp firmware công khai (ESP Web Tools)
│  └─ updates/page.tsx         #    /joy/updates   changelog + bản phát hành
├─ (smt)/smt/                  # SMT WORKSPACE: dashboard nhà máy, demo + thực tế (cookie smt_mode của từng người xem)
│  ├─ layout.tsx               #    Header riêng + nút Demo/Thực tế, bật/tắt bằng key "smt-workspace"
│  ├─ page.tsx                 #    /smt              tổng quan: KPI, so sánh 3 cấp line, OEE tuần, Pareto, theo quý
│  ├─ line/ line/[code]/       #    /smt/line[/L05]   sơ đồ trạm, OEE, Yield, Feeder, 8D/4M/việc của line
│  ├─ bao-cao/[report]/        #    /smt/bao-cao/oee-line-balance... 5 mẫu báo cáo trên dữ liệu đang xem
│  ├─ cong-viec/               #    /smt/cong-viec    giao việc, Kanban, "cần theo dõi", nghiệm thu / trả lại
│  ├─ doi-ngu/                 #    /smt/doi-ngu      chấm điểm kỹ sư theo quý (công thức hiển thị trên trang)
│  ├─ chat/                    #    /smt/chat         nhóm thảo luận (đăng nhập), đánh dấu "Vấn đề"
│  ├─ bao-cao-tu-dong/         #    /smt/bao-cao-tu-dong  báo cáo ngày/tuần theo giờ chốt
│  ├─ nhap-lieu/               #    /smt/nhap-lieu/<bộ dữ liệu>, /8d   nhập liệu cho Admin + Trợ lý
│  ├─ quan-tri/                #    /smt/quan-tri     tài khoản, duyệt xoá, lịch báo cáo, kênh chat
│  └─ dang-nhap/ tai-khoan/    #    đăng nhập Trợ lý / Kỹ sư (cookie smt_session, không vào được /admin)
├─ (shop)/shop/                # 3) CỬA HÀNG cho khách mua hàng
│  ├─ layout.tsx               #    ShopHeader + giỏ hàng + chat "shop", bật/tắt bằng key "showcase"
│  ├─ page.tsx                 #    /shop                     trang bán hàng (slideshow, lọc, tìm kiếm)
│  ├─ san-pham/[slug]/         #    /shop/san-pham/<slug>     chi tiết sản phẩm
│  ├─ thanh-toan/              #    /shop/thanh-toan          đặt hàng (COD / chuyển khoản VietQR)
│  └─ don-hang/[code]/         #    /shop/don-hang[/<mã>]     tra cứu & theo dõi đơn
├─ admin/                      # 4) CMS
│  ├─ login/page.tsx           #    /admin/login (công khai)
│  └─ (protected)/             #    layout.tsx chặn toàn bộ nếu chưa đăng nhập
│     ├─ page.tsx              #    /admin          nội dung, bật/tắt trang, quyền riêng tư
│     ├─ layout/page.tsx       #    /admin/layout   kéo thả bố cục trang chủ
│     ├─ hubs/page.tsx         #    /admin/hubs     danh sách hub + tài liệu
│     ├─ shop/                 #    /admin/shop     tổng quan, sản phẩm, đơn hàng, cài đặt cửa hàng
│     ├─ smt/                  #    /admin/smt      tổng quan, nhập dữ liệu (data/[dataset]), 8D, xuất báo cáo, sổ tay (handbook),
│     │                        #                    dữ liệu demo & dung lượng (demo), cài đặt
│     ├─ firmware/ xiaozhi/
└─ api/                        # Route handler (giữ nguyên đường dẫn cũ)
```

## Quy tắc

- Route tĩnh luôn ưu tiên hơn `[hub]`, nên `/du-an`, `/admin`, `/cv`... không bị hub "nuốt".
  Không đặt slug hub trùng tên route tĩnh.
- Slug hub không tồn tại → `notFound()` (404).
- `/nap-firmware` (link cũ) được redirect sang `/joy/flash` trong `next.config.mjs`.
- `/san-pham-trung-bay` (link cũ) được redirect sang `/shop`; `/admin/orders` sang `/admin/shop/orders`.
- `/tong-quan` (link cũ, mã QR trên CV đã in) được redirect về `/`.
- Dữ liệu SMT có cột `is_demo`: chế độ Demo chỉ đọc/ghi dòng `is_demo = true`, Thực tế chỉ `false`.
  Chế độ là cookie `smt_mode` của từng trình duyệt nên chuyển Demo không ảnh hưởng người khác.
- Phân quyền /smt (Admin / Trợ lý / Kỹ sư) nằm ở `src/lib/smt/permissions.ts`. API kiểm tra lại quyền ở server.
  Trợ lý dùng chung API `/api/admin/smt/data/*` và `GET /api/admin/smt/settings` với Admin; mọi API `/api/admin/*` khác chỉ Admin.
- `/api/smt/templates/<mẫu>` trả file Excel mẫu trống (link công khai, dùng trên trang Tài liệu).
- `/api/firmware/latest` **không được đổi đường dẫn**: WebUI của robot gọi API này để kiểm tra OTA.
- Portfolio **không** chứa link nạp firmware, Project Hub hay Cửa hàng.

## Bật/tắt trang

`site_visibility` (Supabase) hoặc `src/content/pages/visibility.json`:

| Key | Áp dụng cho |
|---|---|
| `overview` | `/` (trang chủ) |
| `journey`, `projects`, `showcase`, `docs` | các trang Portfolio tương ứng |
| `handbook` | `/tai-lieu-ky-thuat/so-tay/**` |
| `smt` | `/tai-lieu-ky-thuat/smt-reports/**` và link tải `/api/smt/templates/*` |
| `smt-workspace` | toàn bộ `/smt/**` (khi tắt: khách thấy "Đang bảo trì", admin vẫn xem được) |
| `hub:<slug>` | toàn bộ `/<slug>/**` (tự sinh cho mỗi hub) |

Key chưa từng lưu mặc định là **bật**.
