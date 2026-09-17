# Hướng dẫn tìm và sửa nội dung website

Tài liệu này giúp bạn biết **muốn sửa mục nào thì vào file nào**.

## 1) Sửa thông tin cá nhân (Tên, SĐT, Email, Slogan, Địa chỉ, Năm sinh, Quê quán)
- File: [src/content/pages/site.json](src/content/pages/site.json)
- Khối cần sửa: `profile`
  - `fullName`, `displayName`, `title.vi/en`, `slogan.vi/en`
  - `phone`, `email`, `location`, `birthDate`, `hometown`

## 2) Sửa mục Điểm nổi bật
- File: [src/content/pages/site.json](src/content/pages/site.json)
- Khối cần sửa: `highlights.vi` và `highlights.en`

## 3) Sửa kỹ năng
- File: [src/content/pages/site.json](src/content/pages/site.json)
- Khối cần sửa: `skills[]`

## 4) Sửa trang Hành Trình (Timeline)
- File dữ liệu: [src/content/experience/experience.json](src/content/experience/experience.json)
- Sửa tại mỗi `items[]`:
  - `company`, `role.vi/en`, `startDate`, `endDate`
  - `equipmentTags[]`, `responsibilities.vi/en`
  - `problemRootCauseAction.vi/en`, `trainingActivities.vi/en`
- File giao diện trang: [src/app/hanh-trinh/page.tsx](src/app/hanh-trinh/page.tsx)

## 5) Sửa trang Dự Án
- File dữ liệu: [src/content/projects/projects.json](src/content/projects/projects.json)
- Sửa tại mỗi `items[]`:
  - `slug`, `title.vi/en`, `category`, `status`
  - `summary.vi/en`, `equipmentTags[]`, `gallery[]`, `lessonsLearned.vi/en`
- File giao diện danh sách: [src/app/du-an/page.tsx](src/app/du-an/page.tsx)
- File giao diện chi tiết: [src/app/du-an/[slug]/page.tsx](src/app/du-an/[slug]/page.tsx)

## 6) Sửa trang Tài Liệu Kỹ Thuật
- File dữ liệu: [src/content/docs/docs.json](src/content/docs/docs.json)
- Sửa tại mỗi `items[]`:
  - `slug`, `title.vi/en`, `topic`, `visibility`
  - `summary.vi/en`, `fileUrl`, `equipmentTags[]`
- File giao diện danh sách: [src/app/tai-lieu-ky-thuat/page.tsx](src/app/tai-lieu-ky-thuat/page.tsx)
- File giao diện chi tiết: [src/app/tai-lieu-ky-thuat/[slug]/page.tsx](src/app/tai-lieu-ky-thuat/[slug]/page.tsx)

## 7) Sửa mật khẩu tài liệu private
- File: [.env.example](.env.example)
- Biến: `NEXT_PUBLIC_PRIVATE_DOCS_PASSWORD_HASH`
- Bạn đổi mật khẩu mới bằng cách tạo hash SHA-256 rồi thay vào biến này.

## 8) Sửa ảnh đại diện và ảnh nền
- Ảnh đại diện box đầu: [public/assets/images/profile-mr-jay.jpg](public/assets/images/profile-mr-jay.jpg)
- Ảnh nền SMT: [public/assets/images/smt-bg.png](public/assets/images/smt-bg.png)
- CSS nền: [src/app/globals.css](src/app/globals.css)
- Giao diện box đầu: [src/app/tong-quan/page.tsx](src/app/tong-quan/page.tsx)

## 9) Chạy thử nhanh sau khi sửa
```bash
npm run dev
```
Mở trình duyệt: `http://localhost:3000`
