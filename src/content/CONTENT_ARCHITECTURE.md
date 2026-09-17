# content - Dữ liệu nội dung

Toàn bộ dữ liệu nghiệp vụ nằm ở đây để cập nhật độc lập với giao diện.

## Domain dữ liệu
- `experience/`: hồ sơ kinh nghiệm, timeline.
- `projects/`: dự án, tài nguyên ảnh/tài liệu kèm theo.
- `docs/`: thư viện tài liệu kỹ thuật.

## Quy tắc dữ liệu
- Mỗi file JSON bắt buộc có `schemaVersion`.
- Dùng `id` ổn định, `slug` duy nhất.
- Không xóa field cũ ngay; deprecate theo vòng đời.
