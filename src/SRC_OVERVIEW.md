# src - Ứng dụng chính

Thư mục chứa toàn bộ mã nguồn website.

## Cấu trúc chuẩn
- `app/`: route và page-level layout.
- `components/`: UI component tái sử dụng.
- `content/`: dữ liệu JSON theo domain.
- `lib/`: helper, parser, normalizer, validator.
- `styles/`: style global và token theme.

## Nguyên tắc
- Không hardcode dữ liệu business vào component.
- Ưu tiên đọc dữ liệu qua lớp `lib` để giữ tương thích schema cũ.
- Mọi thay đổi lớn cần ghi vào changelog tương ứng.
