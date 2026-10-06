# Kế hoạch triển khai online (Vercel + Supabase)

## Mục tiêu
- Web chạy online ổn định.
- Có đăng nhập admin ở mọi nơi.
- Có backend dữ liệu để mở rộng lâu dài.
- Có luồng CI/CD: push Git -> deploy web + cập nhật schema DB.
- Ảnh/video/tài liệu đính kèm lưu bền vững trên cloud.

---

## Trạng thái thực hiện

### Đã làm sẵn trong repo
- [x] Tạo tài liệu kế hoạch chi tiết này.
- [x] Tạo workflow GitHub Actions để đẩy migration Supabase tự động khi push nhánh `main`.
- [x] Tạo cấu trúc `supabase/migrations` và migration khởi tạo bảng cơ bản.
- [x] Cập nhật `.env.example` với biến môi trường cho Supabase.

### Cần bạn thao tác (không thể tự động từ máy local)
- [ ] Tạo Supabase Project trên dashboard.
- [ ] Tạo Vercel Project và liên kết GitHub repo.
- [ ] Khai báo Secrets trên GitHub cho workflow Supabase.
- [ ] Khai báo Environment Variables trên Vercel/Supabase.
- [ ] Chạy lần đầu migration vào Supabase production.

---

## 1) Tạo Supabase project (bạn thực hiện)
1. Vào https://supabase.com -> New project.
2. Chọn region gần người dùng (Singapore là phù hợp).
3. Lưu lại thông tin quan trọng:
   - `Project URL`
   - `Anon key`
   - `Project ref`
   - `Database password`

Kết quả mong muốn: có project Supabase sẵn sàng, truy cập được SQL Editor.

---

## 2) Kết nối Vercel với Git (bạn thực hiện)
1. Vào https://vercel.com -> Add New Project.
2. Import repo GitHub của dự án.
3. Framework preset: Next.js.
4. Chọn nhánh production: `main`.

Kết quả mong muốn: mỗi lần push `main`, Vercel tự build/deploy.

---

## 3) Biến môi trường cần khai báo

### 3.1 Trên Vercel (Project Settings -> Environment Variables)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `NEXT_PUBLIC_PRIVATE_DOCS_PASSWORD_HASH`
- (nếu dùng email) `RESEND_API_KEY`, `ORDER_NOTIFY_EMAIL_TO`, `ORDER_NOTIFY_EMAIL_FROM`

### 3.2 Trên GitHub (Repo -> Settings -> Secrets and variables -> Actions)
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

---

## 4) Migration DB bằng GitHub Actions

Workflow đã tạo tại:
- `.github/workflows/supabase-db-push.yml`

Cách hoạt động:
- Trigger khi push vào `main` và có thay đổi trong thư mục `supabase/**`.
- Tự chạy `supabase link` + `supabase db push`.

Lưu ý:
- Workflow chỉ cập nhật schema DB theo migration.
- Nội dung dữ liệu thực tế (record) không tự seed lại mỗi lần push.

---

## 5) Lưu ảnh/video/tài liệu sau này ở đâu?

Khuyến nghị chính:
- Lưu file trên **Supabase Storage** (bucket):
  - `images`
  - `videos`
  - `docs`
- Lưu metadata trong Postgres:
  - tên file
  - đường dẫn storage
  - loại file
  - dung lượng
  - thời điểm upload

Vì sao không lưu trong repo Git:
- Repo phình to nhanh.
- Build/deploy chậm.
- Không phù hợp cho upload online từ admin.

---

## 6) Checklist go-live
- [ ] Vercel deploy thành công từ nhánh `main`.
- [ ] API chạy ổn trên domain public.
- [ ] Supabase migration chạy pass.
- [ ] Admin login hoạt động trên môi trường online.
- [ ] Upload file vào Storage thành công.
- [ ] Các trang đọc dữ liệu không lỗi.

---

## 7) Hướng dẫn bạn hỗ trợ khi tới bước cần thao tác

### Bước A: Lấy SUPABASE_ACCESS_TOKEN
1. Vào Supabase Dashboard -> Account -> Access Tokens.
2. Tạo token mới.
3. Copy token và lưu vào GitHub Secret `SUPABASE_ACCESS_TOKEN`.

### Bước B: Lấy SUPABASE_PROJECT_REF
1. Mở project Supabase.
2. Vào Project Settings -> General.
3. Copy `Reference ID`.
4. Dán vào GitHub Secret `SUPABASE_PROJECT_REF`.

### Bước C: Lấy SUPABASE_DB_PASSWORD
1. Dùng password đã tạo lúc tạo project.
2. Lưu vào GitHub Secret `SUPABASE_DB_PASSWORD`.

### Bước D: Điền env trên Vercel
1. Vercel -> Project -> Settings -> Environment Variables.
2. Thêm đầy đủ biến ở mục 3.1.
3. Redeploy project.

---

## 8) Giai đoạn tiếp theo (sau khi go-live)
- Chuyển dần dữ liệu JSON sang DB (projects, docs, showcase, site settings).
- Thêm RLS policy cho từng bảng.
- Viết API admin CRUD dùng Supabase thay vì ghi file local.
- Thêm audit log thao tác admin.
