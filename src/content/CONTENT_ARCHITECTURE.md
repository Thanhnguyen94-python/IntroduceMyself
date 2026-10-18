# content - Dữ liệu nội dung

Toàn bộ dữ liệu nghiệp vụ nằm ở đây để cập nhật độc lập với giao diện.
Khi có Supabase, các store trong `src/lib/*-store.ts` đọc DB trước, file JSON là dữ liệu dự phòng/seed.

```
src/content/
├─ pages/
│  ├─ site.json            # profile, highlights, skills, privacy   (DB: site_content.primary)
│  ├─ home-layout.json     # thứ tự + bật/tắt section trang chủ    (DB: site_content.home_layout)
│  └─ visibility.json      # bật/tắt trang                         (DB: site_visibility)
├─ experience/             # Hành trình                            (DB: journey)
├─ projects/               # Case study Portfolio                  (DB: projects)
├─ docs/                   # Tài liệu kỹ thuật SMT (Portfolio)
├─ showcase/ orders/
└─ hubs/                   # PROJECT HUB: mỗi thư mục = 1 dự án cho maker
   └─ joy/
      ├─ hub.json          # tên, mô tả, tính năng, thông số, firmware.board, docSections, updates
      └─ docs/
         ├─ start/quick-start.md
         ├─ hardware/bom.md, wiring.md, audio-max98357a.md
         └─ troubleshooting/servo-motor.md, flashing.md
```

## Hub sửa trên web (Admin → Danh sách Hub & Docs)

| Môi trường | Bấm "Lưu" sẽ ghi vào | Hiệu lực |
|---|---|---|
| Production (có Supabase) | `site_content`: `hub:<slug>` (cấu hình) + `hub-docs:<slug>` (tài liệu) | Ngay lập tức |
| Local (không có Supabase) | `src/content/hubs/<slug>/hub.json` + `docs/*.md` | Sau khi commit & deploy |

Thứ tự ưu tiên khi đọc: **database → file trong repo**. "Khôi phục bản gốc" = xoá 2 dòng database, quay về file.
Hướng dẫn cho người dùng: `docs/WEB_USAGE_GUIDE.md` (hiển thị ở `/admin/guide`).

## Thêm một dự án mới (vd Robot_don_nha)

Cách nhanh nhất: Admin → Danh sách Hub & Docs → **Tạo Project Hub mới**. Hoặc bằng file:

```bash
npm run new:hub -- don-nha "Robot_don_nha"
```

Lệnh này copy mẫu `hubs/_template` và tạo sẵn:
- `src/content/hubs/don-nha/hub.json` + `docs/` (Bắt đầu nhanh, BOM, Đấu dây, Lỗi thường gặp)
- `public/assets/images/hubs/don-nha/`: nơi để ảnh (sơ đồ, ảnh bìa), xem `HUB_IMAGES_GUIDE.md`
- `public/firmware/don-nha/manifest.json`

Sau đó:
1. Sửa `hub.json`. Nếu robot có firmware, đặt `firmware.board` trùng cột `board` khi phát hành ở `/admin/firmware`.
   Không có firmware → xoá khối `"firmware"`, trang Nạp firmware tự ẩn.
2. Viết/sửa các file `.md` trong `docs/`. Thư mục con = đường dẫn con.
3. Nối với Portfolio: tạo case study ở Admin → Quản lý Dự án, rồi ghi slug đó vào `"caseStudySlug"` trong hub.json.
   Trang case study, thẻ dự án và footer tự hiện link "Mở Project Hub".
4. `npm run dev` xem thử → commit → deploy.

Không cần sửa code giao diện: route `/don-nha/**`, nút bật/tắt `hub:don-nha` trong Admin và menu chuyển hub đều tự sinh.

## Frontmatter tài liệu

```md
---
title: Tiêu đề bài
description: Một câu mô tả (hiện ở mục lục)
section: hardware        # khớp id trong hub.json > docSections
order: 1                 # thứ tự trong section
updated: 2026-10-18
---
```

Hỗ trợ GitHub Flavored Markdown (bảng, code block) và callout `> [!NOTE] / [!TIP] / [!IMPORTANT] / [!WARNING] / [!DANGER]`.

## Quy tắc dữ liệu

- Mỗi file JSON bắt buộc có `schemaVersion`.
- Dùng `id` ổn định, `slug` duy nhất.
- Không xóa field cũ ngay; deprecate theo vòng đời. Field mới luôn optional + có normalizer.
