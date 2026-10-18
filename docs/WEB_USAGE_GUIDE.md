---
title: Hướng dẫn sử dụng Web (Admin)
description: Đăng nhập, quản lý dự án, chèn ảnh/video, Kho Media và đổi mật khẩu.
updated: 2026-10-18
---

Web có 3 khu vực:

| Khu vực | Địa chỉ | Dành cho |
|---|---|---|
| Portfolio | `/`, `/hanh-trinh`, `/du-an`… | Nhà tuyển dụng |
| Project Hub | `/joy`, `/joy/docs`, `/joy/flash`… | Người tự lắp robot (maker) |
| Admin | `/admin` | Chỉ bạn (cần đăng nhập) |

## 1. Đăng nhập

1. Mở `https://<tên-miền>/admin` → tự chuyển sang trang đăng nhập.
2. Nhập **tài khoản** và **mật khẩu**. Bấm 👁 ở cuối ô để xem lại mật khẩu vừa gõ.
3. Đăng nhập giữ trong 7 ngày. Bấm **⎋ Đăng xuất** ở cuối menu trái khi dùng máy lạ.

> [!WARNING]
> Nhập sai **5 lần liên tiếp** sẽ bị khoá 15 phút. Nếu database gặp sự cố, web sẽ **từ chối đăng nhập** (không có mật khẩu dự phòng), chờ database ổn định rồi thử lại.

### Đăng nhập khi chạy trên máy (local)

Khi chạy `npm run dev` mà chưa nối Supabase, tài khoản lấy từ file `.env.local`:

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=mat-khau-local-cua-ban
ADMIN_SESSION_SECRET=   # tạo bằng: npm run secret:generate
```

Sửa file xong thì khởi động lại `npm run dev`.

## 2. Đổi mật khẩu

1. Admin → **🔑 Đổi mật khẩu**.
2. Nhập mật khẩu hiện tại, mật khẩu mới (**ít nhất 10 ký tự**), nhập lại lần nữa. Thanh màu cho biết độ mạnh.
3. Bấm **Đổi mật khẩu**. Lần đăng nhập sau dùng mật khẩu mới.

> [!TIP]
> Mật khẩu mạnh: dài trên 14 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt. Ví dụ dạng câu: `Robot-Joy-chay-2-banh!`

### Quên mật khẩu

Trên máy tính có file `.env.local` chứa khoá Supabase, chạy:

```bash
npm run admin:set-password -- admin
```

Script hỏi mật khẩu mới (gõ không hiện chữ) rồi ghi thẳng vào database.

## 3. Hai loại "dự án" và nên sửa ở đâu

| | Case Study (Portfolio) | Project Hub |
|---|---|---|
| Ví dụ | Tủ lưới thép, Khay nạp IC, Joy_chi_cot | Joy_chi_cot |
| Nội dung | Mục tiêu, giải pháp, ảnh, bài học | Tính năng, thông số, tài liệu, nạp firmware |
| Sửa ở | Admin → **📝 Nội dung & hiển thị** → tab *Quản lý Dự án* | Admin → **📚 Danh sách Hub & Docs** |

Một dự án có thể có **cả hai**: case study cho nhà tuyển dụng đọc, Hub cho người muốn tự lắp. Nối hai bên ở Hub → tab *Thông tin chung* → **Case study liên kết**. Trang case study sẽ tự hiện nút **"Mở Project Hub"**.

## 4. Thêm / sửa Case Study (Portfolio)

1. Admin → **📝 Nội dung & hiển thị** → tab **Quản lý Dự án** → **Thêm** (hoặc **Sửa** ở dự án có sẵn).
2. Điền tiêu đề, mục tiêu, mô tả, bài học (mỗi dòng 1 ý), tag.
3. **Album ảnh**: ảnh đầu tiên là ảnh đại diện. Dùng ↑ ↓ để đổi thứ tự.
4. Bấm **Lưu**, web cập nhật ngay.

## 5. Thêm / sửa Project Hub

### Tạo hub mới

1. Admin → **📚 Danh sách Hub & Docs** → khung **➕ Tạo Project Hub mới**.
2. Nhập **Tên dự án** (vd `Robot_don_nha`). Đường dẫn tự sinh (vd `robot-don-nha`), sửa lại nếu muốn ngắn hơn (`don-nha`).
3. Bấm **Tạo hub**. Web tạo sẵn 4 bài khung: Bắt đầu nhanh, BOM, Sơ đồ đấu dây, Lỗi thường gặp, rồi mở trình sửa.

### Các tab trong trình sửa hub

| Tab | Dùng để |
|---|---|
| 📝 Thông tin chung | Tên, emoji, trạng thái, mô tả, case study liên kết, bật trang nạp firmware |
| 🖼 Ảnh / Video bìa | Slideshow đầu trang (xem mục 6) |
| 🧩 Bố cục trang | Kéo thả thứ tự khối, bỏ tick để ẩn khối |
| ✨ Tính năng | Mục "Robot làm được gì?" |
| 📐 Thông số | Bảng thông số chính |
| 🗂 Nhóm tài liệu | Các nhóm trên menu trái của trang Docs |
| 📚 Tài liệu | Viết bài hướng dẫn (Markdown), xem trước ngay |
| 🆕 Cập nhật | Nhật ký phiên bản; mục đầu tiên là "mới nhất" |

Trong mọi danh sách: kéo biểu tượng **⋮⋮** để sắp xếp, hoặc dùng nút **↑ ↓**, **Xoá**, **+ Thêm**.

Sửa xong bấm **💾 Lưu thay đổi** (góc trên, luôn hiện). Rời trang khi chưa lưu, trình duyệt sẽ hỏi lại.

> [!NOTE]
> **Trên web thật** (có Supabase): bấm Lưu là trang hub đổi **ngay**, không cần deploy. File `hub.json` trong repo chỉ còn là bản gốc; nút **↺ Khôi phục bản gốc** ở cuối trang bỏ mọi chỉnh sửa trên web để dùng lại bản đó.
>
> **Chạy local** (chưa có Supabase): bấm Lưu sẽ ghi thẳng vào `src/content/hubs/<slug>/`. Nhớ commit để đưa lên web.

### Bật / tắt hub

Admin → **📝 Nội dung & hiển thị** → tab *Tổng quan & Cài đặt hiển thị* → mục **Hiển thị/Ẩn các trang** → tick/bỏ tick **Project Hub: …** → **Lưu cài đặt hiển thị**. Hub tắt sẽ hiện "Đang bảo trì" và link từ Portfolio tự ẩn.

## 6. Chèn ảnh / video

Mọi ô có nhãn **Ảnh / video** đều là ô thông minh: **dán link là web tự nhận dạng** và hiện khung xem trước bên cạnh.

| Bạn dán | Web hiển thị |
|---|---|
| `https://youtu.be/…`, `youtube.com/watch?v=…`, `youtube.com/shorts/…` | Trình phát YouTube (hiện ảnh thumbnail + nút ▶, bấm mới tải video) |
| Link chia sẻ Google Drive `drive.google.com/file/d/…/view` | Ảnh; nếu file là video/PDF thì tự chuyển sang trình xem của Drive |
| `/assets/images/…/abc.jpg` (file trong repo) | Ảnh |
| `…/video.mp4` | Trình phát video |

### Cách 1: Dán link (không tốn dung lượng)

- **YouTube**: mở video → **Chia sẻ** → **Sao chép**, dán vào ô.
- **Google Drive**: chuột phải file → **Chia sẻ** → *Quyền truy cập chung*: **Bất kỳ ai có đường liên kết** → **Sao chép đường liên kết**, dán vào ô.

> [!IMPORTANT]
> File Drive để chế độ "Bị hạn chế" thì khách xem web sẽ thấy lỗi. Luôn đổi sang **Bất kỳ ai có đường liên kết**.

Link Drive là video hoặc PDF mà web hiển thị sai: chọn đúng loại ở ô **Tự nhận diện → Video / Tài liệu** bên cạnh nút upload.

### Cách 2: Upload file

Bấm **⬆ Upload file** ngay cạnh ô → chọn ảnh/video/PDF. File lên Supabase Storage, link tự điền vào ô.

### Slideshow ảnh bìa hub

Hub → tab **🖼 Ảnh / Video bìa**:

1. **+ Thêm ảnh / video** cho mỗi slide, dán link hoặc upload.
2. Kéo **Tự chuyển sau … giây** (2–15 giây).
3. Tick **Tự phát video** nếu muốn video chạy (tắt tiếng) khi tới slide đó.

Slideshow tự dừng khi khách rê chuột vào hoặc đang xem video.

### Chèn ảnh/video vào bài tài liệu

Hub → tab **📚 Tài liệu** → chọn bài → đặt con trỏ chỗ muốn chèn → **🖼 Ảnh / Video** → dán link hoặc upload → **Chèn vào vị trí con trỏ**.

Hoặc gõ tay trong bài:

```md
![Sơ đồ đấu dây](https://drive.google.com/file/d/ID/view "Hình 1. Sơ đồ tổng")
![video lắp ráp](https://drive.google.com/file/d/ID/view)

https://youtu.be/VIDEO_ID
```

- Phần trong ngoặc kép là chú thích hiện dưới ảnh.
- Link Drive là video/PDF: bắt đầu mô tả bằng chữ `video` hoặc `pdf`.
- Một dòng **chỉ có link YouTube/Drive** sẽ tự thành khung xem video.

Thanh công cụ còn có nút chèn nhanh tiêu đề, bảng, khung 💡 Mẹo / ⚠️ Cảnh báo / ⛔ Nguy hiểm. Chế độ **Song song** cho thấy bài hiển thị thế nào ngay khi gõ.

## 7. Kho Media

Admin → **📝 Nội dung & hiển thị** → tab **Kho Media Storage**:

1. Chọn **bucket**: `images` (ảnh), `videos` (video), `docs` (PDF, file khác).
2. Nhập **folder** để dễ tìm lại (vd `hubs/joy`, `projects`).
3. **Upload** → bấm **Copy URL** → dán vào bất kỳ ô ảnh/video nào hoặc vào bài tài liệu.

> [!TIP]
> Ảnh nên nhỏ hơn 500 KB (JPG/WebP); sơ đồ đấu dây dùng PNG rộng 1600–2000 px để phóng to vẫn rõ. Video dài nên đưa lên YouTube rồi dán link, đỡ tốn dung lượng Supabase.

## 8. Bố cục trang chủ Portfolio

Admin → **🧩 Bố cục trang chủ**: kéo thả các khối (Giới thiệu, Số liệu, Case Study, Kỹ năng…), bật/tắt bằng công tắc, chọn dự án nổi bật bên phải → **Lưu thay đổi**.

## 9. Phát hành firmware

Admin → **📦 Phát hành firmware** → **+ Thêm bản mới** → chọn board (trùng ô *Board* trong tab Thông tin chung của hub) → upload file `.bin` → tick *Publish*. Bản mới hiện ngay ở `/<hub>/flash` và robot thấy khi bấm "Kiểm tra bản mới" trong WebUI.

## Câu hỏi nhanh

| Câu hỏi | Trả lời |
|---|---|
| Sửa trên web có mất khi deploy code mới không? | Không. Dữ liệu sửa trên web nằm trong database, deploy không ghi đè. |
| Ảnh Drive không hiện? | Kiểm tra quyền chia sẻ "Bất kỳ ai có đường liên kết". |
| Muốn bỏ hết chỉnh sửa trên web của 1 hub? | Cuối trang sửa hub → **↺ Khôi phục bản gốc**. |
| Hub mới không thấy trên Portfolio? | Gán **Case study liên kết** và kiểm tra hub đang bật. |
