# Portfolio SMT Engineer - Project Blueprint

## 1) Mục tiêu dự án
Xây dựng website cá nhân theo hướng **Portfolio + Personal Knowledge Base** cho kỹ sư SMT/Điện tử.

Trọng tâm:
- Giới thiệu năng lực và điểm nổi bật chuyên môn.
- Trình bày hành trình nghề nghiệp theo mốc thời gian.
- Lưu trữ dự án (đang làm/đã hoàn thành) gồm mô tả, tài liệu, hình ảnh.
- Xây thư viện tài liệu kỹ thuật để tự tra cứu hoặc chia sẻ tham khảo.

## 2) Định hướng kỹ thuật (chuẩn mở rộng)
- Kiến trúc đề xuất: Next.js App Router + Tailwind CSS + TypeScript.
- Mô hình dữ liệu: Data-Driven, tách dữ liệu khỏi giao diện.
- Nguồn dữ liệu chính đặt trong JSON theo domain:
	- `experience.json`
	- `projects.json`
	- `docs.json`
- Hosting mục tiêu: Cloudflare Pages.

## 3) Quy ước đặt tên trang (đã chốt)
- Trang 1: `Tổng Quan` (`/tong-quan`)
- Trang 2: `Hành Trình` (`/hanh-trinh`)
- Trang 3: `Dự Án` (`/du-an`)
- Trang 4: `Tài Liệu Kỹ Thuật` (`/tai-lieu-ky-thuat`)

Trang `/` có thể làm landing chuyển tiếp vào `Tổng Quan` hoặc chứa snapshot 4 khối nội dung.

Hiện tại đã chốt: `/` tự động chuyển sang `/tong-quan`.

## 4) Theme chủ đạo
- Màu chủ đạo: xanh dương SMT.
- Bắt buộc hỗ trợ Light/Dark mode.
- Ưu tiên độ tương phản đạt WCAG AA.

## 5) Nguyên tắc tương thích dữ liệu cũ
Để thêm thông tin mới mà không phá dữ liệu cũ:
1. Mỗi file JSON có `schemaVersion`.
2. Chỉ thêm field mới theo hướng optional trước.
3. Có lớp chuẩn hóa dữ liệu (normalizer) để map field cũ -> mới.
4. Có default value khi field cũ thiếu.
5. Changelog dữ liệu theo từng domain.

## 6) Bố cục tài liệu trong repo
- README tổng ở thư mục gốc: file này.
- Mỗi thư mục chức năng dùng file `.md` **định danh theo vai trò** (không dùng trùng `README.md`).

Quy ước đặt tên tài liệu nội bộ:
- `*_GUIDE.md`: hướng dẫn module (ví dụ `COMPONENTS_GUIDE.md`, `LIB_GUIDE.md`).
- `PAGE_*.md`: mô tả trang/route.
- `SCHEMA_*.md`: mô tả schema dữ liệu.
- `*_OVERVIEW.md` / `*_ARCHITECTURE.md`: tài liệu tổng quan.

Lưu ý quan trọng:
- Các file `page.tsx` xuất hiện nhiều là **chuẩn bắt buộc của Next.js App Router** theo từng route, không phải trùng lặp sai kiến trúc.

## 7) Câu hỏi cần bạn xác nhận trước khi code chính thức
Đã xác nhận:
1. Song ngữ: Việt/Anh.
2. Liên hệ chính:
	- Họ tên: Nguyễn Văn Thạnh (Mr Jay)
	- SĐT: 0962953260
	- Email: nguyenvanthanh110394@gmail.com
3. `Tải CV`: PDF sinh động theo dữ liệu (trang `/cv` + in PDF).
4. `Private Docs`: dùng mật khẩu. (Triển khai so khớp hash SHA-256 qua biến môi trường công khai để dễ cấu hình.)
5. Route `/` chuyển thẳng sang `/tong-quan`.
6. Bộ tag dự án theo thiết bị SMT.
7. Chưa có domain riêng.

## 8) Trạng thái hiện tại
Đã hoàn tất:
- Scaffold Next.js + Tailwind + TypeScript.
- 4 trang chính + route chi tiết dự án/tài liệu.
- Data-driven JSON song ngữ.
- Theme xanh dương SMT + Dark/Light mode.
- Floating contact widget.
- Password gate cho tài liệu private.
- Build kiểm tra thành công.
