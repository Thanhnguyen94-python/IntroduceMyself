---
title: Hướng dẫn sử dụng Web (Admin)
description: Đăng nhập, quản lý dự án, chèn ảnh/video, Kho Media, đổi mật khẩu, chat với khách, thống kê và cửa hàng.
updated: 2026-10-20
---

Web có 4 khu vực:

| Khu vực | Địa chỉ | Dành cho |
|---|---|---|
| Portfolio | `/`, `/hanh-trinh`, `/du-an`… | Nhà tuyển dụng |
| Project Hub | `/joy`, `/joy/docs`, `/joy/flash`… | Người tự lắp robot (maker) |
| Cửa hàng | `/shop` | Khách mua jig, tool, sản phẩm in 3D |
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

## 10. Chat với khách & Hỏi đáp tài liệu

Khách có 2 cách liên hệ với bạn:

| Kênh | Khách thấy ở đâu | Bạn trả lời ở đâu |
|---|---|---|
| **💬 Box chat** | Nút tròn góc phải dưới, trên mọi trang Portfolio và Hub. Bấm ⤢ để phóng to, — để thu gọn. | Admin → **💬 Hộp thư** → tab *Chat* |
| **❓ Hỏi đáp** | Cuối mỗi bài tài liệu Hub (mục "Hỏi đáp") | Admin → **💬 Hộp thư** → tab *Hỏi đáp tài liệu* |

**Chat:** chọn cuộc trò chuyện bên trái → gõ trả lời → **Gửi** (hoặc Ctrl+Enter). Có sẵn 3 câu trả lời nhanh. Khách thấy trả lời ngay trong khung chat; nếu khách để lại email, họ nhận thêm email báo. Xong việc bấm **✓ Đánh dấu xong**.

**Hỏi đáp:** câu hỏi mới nằm ở *Chờ duyệt*, chưa ai thấy. Bạn có thể:
- **Trả lời & duyệt**: câu hỏi và câu trả lời cùng hiện công khai, người sau đọc được luôn.
- **✓ Duyệt**: chỉ hiện câu hỏi.
- **Ẩn / Xoá**: với câu hỏi spam hoặc trùng.

Email/Zalo khách để lại **không bao giờ hiển thị công khai**.

> [!TIP]
> Menu **💬 Hộp thư** có chấm đỏ đếm số tin chưa đọc + câu hỏi chờ duyệt. Muốn nhận thông báo qua email/Zalo khi có tin mới: đặt `RESEND_API_KEY` + `ADMIN_NOTIFY_EMAIL` (hoặc `ZALO_WEBHOOK_URL`) trên Vercel.

## 11. Thống kê truy cập

Admin → **📊 Thống kê truy cập**. Chọn khoảng thời gian ở hàng trên cùng (Hôm nay / 7 / 30 / 90 ngày), mọi số liệu bên dưới đổi theo.

| Số liệu | Ý nghĩa |
|---|---|
| Đang online | Số khách hoạt động trong 2 phút gần nhất, tự cập nhật |
| Lượt xem / Khách | Số trang được mở / số người (trình duyệt) khác nhau |
| Thời gian / phiên | Trung bình một lần ghé thăm ở lại bao lâu; % chỉ xem 1 trang rồi thoát |
| Đến từ đâu | Facebook, Google, Zalo… hoặc truy cập trực tiếp. Gắn `?utm_source=ten-nhom` vào link khi chia sẻ để biết nhóm nào mang khách đến |
| Quốc gia / Thành phố | Vị trí gần đúng (chỉ có trên web thật chạy Vercel) |
| Thiết bị / Trình duyệt / HĐH | Khách dùng điện thoại hay máy tính, Chrome hay Safari… |

Bấm **Xem dạng bảng** trên biểu đồ để xem số chính xác từng ngày.

> [!NOTE]
> Thống kê ẩn danh: không cookie theo dõi, không lưu địa chỉ IP, bỏ qua bot và trang Admin. Khách bật "Do Not Track" sẽ không bị ghi.

## 12. Số lần nạp firmware

Mỗi lần khách nạp ở trang `/<hub>/flash`, web ghi lại 4 mốc:

| Mốc | Nghĩa |
|---|---|
| Mở hộp thoại | Khách bấm "Nạp firmware" và chọn cổng |
| Bắt đầu ghi | Bắt đầu xoá/ghi flash (có ghi lại khách có tick *Erase* không) |
| ✅ Thành công | Ghi xong |
| ❌ Lỗi | Kèm thông báo lỗi (vd "Failed to open serial port") |

Xem ở Admin → **📦 Phát hành firmware** (cột *Lượt nạp*) hoặc Admin → **📊 Thống kê truy cập** (bảng chi tiết kèm lỗi gần đây). Nhiều lỗi giống nhau ở một bản → nên viết thêm mục sửa lỗi trong tài liệu.

## 13. Cửa hàng (/shop)

Cửa hàng tách riêng khỏi Portfolio (menu Portfolio không còn mục "Sản phẩm"). Link cũ `/san-pham-trung-bay` tự chuyển sang `/shop`.

**Bật / tắt:** Admin → **Nội dung & hiển thị** → công tắc **Cửa hàng (/shop)**. Khi tắt, khách thấy trang "Đang bảo trì" và không đặt được hàng. Bạn (đã đăng nhập) vẫn xem trước được, có dải vàng báo đang tắt.

### Đăng / sửa sản phẩm — Admin → 🏷️ Sản phẩm

1. Bấm **+ Đăng sản phẩm**, nhập tên (đường dẫn tự tạo theo tên).
2. **Ảnh / video**: bấm **⬆ Upload nhiều ảnh** hoặc dán link (YouTube, Google Drive, `/assets/...`). Kéo ⋮⋮ để đổi thứ tự; ảnh đầu là ảnh đại diện. Có từ 2 ảnh trở lên thì ảnh tự chuyển như slideshow trên cửa hàng.
3. **Giá bán / Giá gốc**: giá gốc cao hơn giá bán thì hiện nhãn "-x%". Giá bán để 0 thì hiện "Liên hệ báo giá" (khách nhắn tin thay vì thêm giỏ).
4. **Tồn kho**: để trống = không giới hạn (làm theo đơn). Có số thì web tự trừ khi khách đặt, tự cộng lại khi đơn bị huỷ / hoàn trả, và chặn đặt quá số còn.
5. **Phân loại** (Màu, Vật liệu…): khách chọn khi mua, cùng một giá.
6. **Trạng thái**: *Đang bán* (khách thấy) · *Nháp* (chỉ bạn thấy, dùng **Lưu & xem** để xem trước) · *Tạm ẩn* (ngừng bán, không mất dữ liệu).
7. Khung bên phải là bản xem trước thẻ sản phẩm.

Trong danh sách có thể sửa nhanh tồn kho, trạng thái, ⭐ nổi bật (hiện đầu trang cửa hàng), đổi thứ tự ↑↓ (nhớ bấm **Lưu thứ tự**), ⧉ nhân bản để đăng mẫu tương tự.

### Xử lý đơn — Admin → 🧾 Đơn hàng

Đơn mới có số đỏ trên menu và được báo qua email / Zalo (cùng cấu hình với chat). Mở đơn để:

- Gọi / Zalo cho khách, **📋 Copy thông tin giao hàng** để dán vào app GHTK / GHN.
- Bấm nút bước tiếp theo: *Xác nhận → Đóng gói → Đang giao → Đã giao*. Ô **Ghi chú gửi khách** (vd mã vận đơn) hiện trên trang theo dõi đơn của khách; tick **Gửi email báo khách** nếu khách để lại email.
- Tick **Đã nhận tiền** khi nhận được chuyển khoản / COD.
- **Ghi chú nội bộ** chỉ bạn thấy.

Khách theo dõi đơn ở `/shop/don-hang` bằng mã đơn (dạng `MJ261020-AB12`) + số điện thoại.

### Cài đặt — Admin → ⚙️ Cài đặt cửa hàng

Tên shop, khẩu hiệu, thanh thông báo trên cùng, slideshow ảnh bìa, danh mục, phí ship và mức miễn phí ship, liên hệ, chính sách đổi trả.

**Nhận chuyển khoản:** tick 🏦, nhập mã ngân hàng (VCB, TCB, MB…), số tài khoản, tên chủ tài khoản. Web hiện mã QR thử 100.000₫ để bạn quét kiểm tra tên. Khi khách chọn chuyển khoản, trang đơn hiện mã VietQR có sẵn số tiền + nội dung = mã đơn.

## 14. Mẫu báo cáo SMT (/tai-lieu-ky-thuat/smt-reports)

Bộ 5 mẫu báo cáo kỹ sư SMT: **8D**, **4M1E**, **OEE & Line Balance**, **Yield & Defect Pareto**, **Feeder & Nozzle**. Khách xem báo cáo mẫu, tải Excel trống (có sẵn công thức, danh sách chọn) hoặc in PDF. Trang Tài liệu có kệ "Bộ mẫu báo cáo SMT" dẫn tới đây.

**Bật / tắt:** Admin → **Nội dung & hiển thị** → công tắc **Mẫu báo cáo SMT**. Khi tắt, trang và link tải Excel đều báo "Đang bảo trì" (bạn đã đăng nhập vẫn xem được).

**Dữ liệu trên trang công khai** (Admin → ⚙️ Cài đặt SMT): mặc định **Demo** (số liệu mô phỏng, an toàn). Chọn **Thực tế** thì trang công khai dùng số liệu bạn nhập nhưng đã bỏ work order, ghi chú, nguyên nhân, người phụ trách; 8D và 4M chỉ hiện bản ghi có tick **Công khai**.

### Nhập dữ liệu — Admin → ⌨️ Nhập dữ liệu

6 bộ dữ liệu: Nhật ký sản xuất (theo ca), Nhật ký lỗi, Cycle time trạm, Thay đổi 4M1E, Danh mục Feeder / Nozzle, Nhật ký Feeder / Nozzle.

- **+ Thêm dòng** → điền → **Lưu & nhập tiếp** (giữ lại ngày, ca, line, model để nhập nhanh nhiều dòng).
- **Dán từ Excel**: copy vùng ô (có hoặc không có dòng tiêu đề) rồi dán. Không có tiêu đề thì thứ tự cột phải giống file **Mẫu nhập .xlsx**. Có 1 dòng sai thì không dòng nào được ghi, web báo đúng dòng sai.
- Nhật ký Feeder / Nozzle: cột feeder có thể ghi mã S/N (vd `FD-001`), không cần id.
- **⬇ Xuất .xlsx** tải đúng các dòng đang lọc.

### Báo cáo 8D — Admin → 🧭 Báo cáo 8D

**+ Mở 8D mới** → nhập tiêu đề → đi qua các bước D0 → D8 (bước đã có nội dung có dấu ✓). D4 có Fishbone 6M và 5 Why cho 2 nhánh: vì sao **xảy ra** và vì sao **lọt**. Bấm **💾 Lưu** (mã 8D tự sinh dạng `8D-2610-01`). Tab **👁 Xem / In** để in PDF hoặc tải Excel.

### Xuất báo cáo — Admin → 📊 Xuất báo cáo

Chọn mẫu và kỳ báo cáo → **Excel (số liệu)** hoặc **In / Lưu PDF** (trong hộp thoại in chọn "Save as PDF"). Bản in có ô ký Người lập / Kiểm tra / Phê duyệt. Tick **Xem bằng dữ liệu demo** để xem thử khi chưa nhập dữ liệu.

### Cài đặt — Admin → ⚙️ Cài đặt SMT

Line (mã, tên, danh sách trạm theo thứ tự, takt time), ca làm việc, danh mục mã lỗi (gắn công đoạn để Pareto tự chia theo In kem / Gắn / Reflow…), mục tiêu OEE / FPY / DPMO / mispick.

## 15. Sổ tay SMT (/tai-lieu-ky-thuat/so-tay)

Sổ tay tra cứu ~54 tham số / khái niệm SMT chia 8 nhóm (Chất lượng & SPC, Năng suất, In kem, Gắn linh kiện, Reflow, Vật tư/MSL/ESD, Kiểm tra & IPC, Giải quyết vấn đề). Mỗi mục có: ý nghĩa, công thức, bảng ngưỡng tham khảo, lưu ý thực tế, mục liên quan; một số mục có **máy tính** (Cpk, DPMO ↔ Sigma, Area ratio, OEE, Takt/UPH, RTY, MTBF, MSL). Trang Tài liệu có thẻ "Sổ tay tra cứu SMT" dẫn tới đây.

**Bật / tắt:** Admin → **Nội dung & hiển thị** → công tắc **Sổ tay SMT**.

### Chỉnh sửa — Admin → 📘 Sổ tay SMT

1. Lần đầu, web đang hiện **bộ mặc định viết sẵn** (nằm trong code). Bấm **📥 Nạp bộ mặc định để chỉnh sửa** để chép vào database – sau đó mới sửa / thêm / ẩn được.
2. **Sửa** một mục: tiêu đề Việt/Anh, ký hiệu, nhóm, thứ tự, công thức, bảng ngưỡng (Tốt / Lưu ý / Nguy cơ / Tham khảo), máy tính kèm theo, nội dung Markdown (có xem trước song song), tags, mục liên quan, tiêu chuẩn tham chiếu. Bấm **💾 Lưu**.
3. **+ Thêm mục**: mục mới mặc định là *Nháp* (chỉ admin thấy). Đổi trạng thái sang *Hiện công khai* khi viết xong; trong danh sách bấm ✓ Hiện / ◌ Nháp để đổi nhanh.
4. Lỡ xoá mục mặc định: bấm **↺ Nạp mục mặc định còn thiếu** (không ghi đè mục bạn đã sửa).

Nội dung chi tiết viết bằng Markdown giống tài liệu Hub: `### Tiêu đề`, bảng `| a | b |`, hộp ghi chú `> [!TIP]`, `> [!WARNING]`, ảnh / YouTube / Drive.

## 16. SMT Workspace (/smt)

Không gian riêng (header riêng, không lẫn trang giới thiệu bản thân), có link qua lại với Portfolio (menu **SMT Dashboard** và chân trang "← Hồ sơ Mr Jay").

| Trang | Nội dung |
|---|---|
| `/smt` | KPI nhà máy, so sánh 3 cấp line (Cơ bản / M-AOI / Pro), OEE theo tuần, Pareto lỗi, dừng máy, so sánh theo quý |
| `/smt/line`, `/smt/line/L05` | Sơ đồ trạm, OEE & Line balance, Yield & Pareto, Feeder/Nozzle, 8D · 4M · công việc của line |
| `/smt/bao-cao/...` | 5 mẫu báo cáo chạy trên dữ liệu đang xem (Excel / PDF) |
| `/smt/cong-viec` | Giao việc, Kanban, ô **Cần theo dõi** (quá hạn, chờ nghiệm thu, bị chặn, đến hẹn hỏi lại, 7 ngày im lặng) |
| `/smt/doi-ngu` | Chấm điểm kỹ sư theo quý, công thức hiển thị ngay trên trang |

**Demo / Thực tế:** nút ở góc phải header. Lựa chọn lưu trong cookie **của trình duyệt bạn**, nên bạn xem Demo thì khách vẫn xem đúng chế độ mặc định của họ.
- Khách: mặc định theo Cài đặt SMT → "Trang công khai dùng dữ liệu". Công việc / đánh giá kỹ sư **thực tế** chỉ admin xem được.
- Admin: sửa công việc ở chế độ Demo chỉ ghi vào dữ liệu demo (`is_demo = true`) → "sân tập" thoải mái, không đụng dữ liệu thật.

**Tạo dữ liệu demo:** Admin → 🧪 **Dữ liệu demo & dung lượng** → **+ Tạo dữ liệu demo** (≈ 61.000 dòng: 10 line, từ đầu quý cách đây 2 quý đến hôm nay, có 8 kỹ sư và ~210 công việc). Chưa tạo thì /smt vẫn xem được (tính tạm trong bộ nhớ) nhưng chưa giao việc thử được. **↻ Tạo lại** = xoá demo cũ và sinh lại theo ngày hôm nay. Trang này cũng hiện dung lượng database so với 500 MB của gói Free và cách sao lưu.

**Bật / tắt:** Admin → **Nội dung & hiển thị** → công tắc **SMT Workspace (/smt)**.

### Tài khoản & phân quyền

| Vai trò | Đăng nhập ở | Được làm |
|---|---|---|
| **Admin** (bạn) | `/admin/login` | Mọi thứ; riêng quyền **nghiệm thu / chấm điểm / trả lại việc**, tạo tài khoản, cài đặt line & KPI, duyệt xoá |
| **Trợ lý** | `/smt/dang-nhap` | Nhập dữ liệu SMT (`/smt/nhap-lieu`), giao / sửa việc, duyệt việc kỹ sư đề xuất, quản lý kỹ sư & kênh chat, đặt lịch báo cáo. Không vào được `/admin`, shop, firmware |
| **Kỹ sư** | `/smt/dang-nhap` | Xem bảng việc của đội; cập nhật việc **của mình** (bắt đầu, tiến độ, giờ, bị chặn, gửi nghiệm thu); đề xuất việc phát sinh (chờ duyệt mới tính điểm); chỉ thấy điểm của mình; chat |

**Cấp tài khoản:** `/smt/quan-tri` → Tài khoản. Với kỹ sư, tạo **hồ sơ kỹ sư** ở `/smt/doi-ngu` (chế độ Thực tế) trước rồi gắn vào tài khoản. Web hiện **mật khẩu tạm 1 lần**, người dùng phải tự đổi khi đăng nhập lần đầu. **Khoá / đổi quyền / đặt lại mật khẩu** đăng xuất họ khỏi mọi thiết bị ngay.

**Xoá dữ liệu (trợ lý):** lần đầu bấm 🗑 → web hỏi lý do và gửi yêu cầu (email + chuông 🔔 trên header cho admin). Admin duyệt ở `/smt/quan-tri` → Yêu cầu xoá, chọn thời hạn: **Chỉ lần này** (xoá đúng dòng đó), **Trong hôm nay**, **Trong 1 tháng** (được xoá thẳng tới hết hạn, hết hạn phải xin lại). Mọi dòng nhập liệu lưu tên người nhập / sửa.

### Thảo luận & báo cáo ngày / tuần

- `/smt/chat`: kênh Chung, mỗi line 1 kênh, kênh chuyên môn (tự tạo lần đầu theo Cài đặt SMT). Gửi ảnh (tự nén), trả lời tin, đánh dấu **⚠ Vấn đề** (gắn line + mã lỗi) để theo dõi tới khi **✓ Đã xử lý**. Admin / trợ lý có nút **→ Tạo việc** từ tin nhắn.
- `/smt/bao-cao-tu-dong`: báo cáo tạo theo **giờ chốt** (đặt ở `/smt/quan-tri` → Lịch, vd cuối mỗi ca 06:00 / 14:00 / 22:00) và **báo cáo tuần**. Nội dung: việc giao / nghiệm thu / trả lại / quá hạn, ai không cập nhật, vấn đề còn mở trong chat, sản lượng & line chưa nhập nhật ký. Báo cáo được tạo khi có người mở /smt sau giờ chốt (muốn đúng giờ tuyệt đối: đặt `CRON_SECRET` và cho cron-job.org gọi `/api/smt/reports/run` mỗi 15 phút).
- **AI (chưa bật):** khi muốn dùng, thêm `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL` trên Vercel (xem `.env.example`), deploy lại, rồi bật "Tóm tắt AI" trong Lịch báo cáo. Không gắn cố định nhà cung cấp nào.

**Line thật:** khai báo ở Admin → ⚙️ Cài đặt SMT. Đặt tên trạm `M-AOI` (trước `Reflow`) và `AXI` để trang tự xếp cấp line; feeder/nozzle gắn với line khi cột **Máy** bắt đầu bằng mã line (vd `L1 · Mounter 2`).

### Phạm vi quản lý (chỉ hiện phần số liệu bạn có)

Admin → ⚙️ Cài đặt SMT → **Phạm vi quản lý**. Chọn nhanh **Quản lý kỹ sư** / **Quản lý sản xuất** / **Giám đốc bộ phận (đầy đủ)**, hoặc tick từng nhóm:

| Nhóm | Gồm |
|---|---|
| 👥 Đội ngũ & công việc | Công việc, Đội ngũ (KPI kỹ sư), việc trong báo cáo ngày/tuần |
| ⚙️ Hiệu suất & thiết bị | OEE (A·P·Q), dừng máy, cycle time, feeder/nozzle, 4M |
| 🎯 Chất lượng | FPY, DPMO, Pareto lỗi, lỗi lọt khách hàng, 8D |
| 📦 Sản lượng | Số board, board/ngày, sản lượng theo line / quý |
| 📊 So sánh cấp line & theo quý | Khối "Đầu tư thiết bị có đáng không", bảng so sánh theo quý |

Nhóm tắt thì ô KPI, cột bảng, biểu đồ, tab line, mẫu báo cáo, mục menu và thẻ nhập liệu tương ứng đều ẩn. **Chỉ ẩn hiển thị**: dữ liệu đã nhập vẫn còn, bật lại là thấy đủ. Mặc định Demo vẫn hiện đầy đủ; tick **Áp dụng cả khi xem Demo** để xem trước trang thật của bạn trông thế nào.

## Câu hỏi nhanh

| Câu hỏi | Trả lời |
|---|---|
| Sửa trên web có mất khi deploy code mới không? | Không. Dữ liệu sửa trên web nằm trong database, deploy không ghi đè. |
| Ảnh Drive không hiện? | Kiểm tra quyền chia sẻ "Bất kỳ ai có đường liên kết". |
| Trang Mẫu báo cáo SMT có lộ số liệu nhà máy không? | Không, mặc định hiện số liệu demo. Chỉ khi bạn chọn "Thực tế" trong Cài đặt SMT mới dùng số liệu thật (đã bỏ thông tin nhạy cảm). |
| Muốn bỏ hết chỉnh sửa trên web của 1 hub? | Cuối trang sửa hub → **↺ Khôi phục bản gốc**. |
| Hub mới không thấy trên Portfolio? | Gán **Case study liên kết** và kiểm tra hub đang bật. |
| Cửa hàng hiện "Đang bảo trì"? | Bật công tắc **Cửa hàng (/shop)** trong Admin → Nội dung & hiển thị. |
| Mình xem Demo có làm khách thấy Demo theo không? | Không. Nút Demo / Thực tế lưu trong cookie riêng trình duyệt của bạn. |
| Link `/tong-quan` cũ (QR trên CV đã in)? | Vẫn dùng được, tự chuyển về Trang chủ. |
| Sản phẩm không hiện trên cửa hàng? | Kiểm tra trạng thái là **Đang bán**. |
