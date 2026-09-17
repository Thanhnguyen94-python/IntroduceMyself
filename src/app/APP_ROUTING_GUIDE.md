# app - Route tầng giao diện

Nơi định nghĩa trang và điều hướng chính theo App Router.

## Các route mục tiêu
- `/` (landing hoặc redirect)
- `/tong-quan`
- `/hanh-trinh`
- `/du-an`
- `/tai-lieu-ky-thuat`

## Quy tắc tổ chức
- Mỗi route có thư mục riêng với `README.md` mô tả trách nhiệm.
- Logic nghiệp vụ phức tạp tách qua `components/` và `lib/`.
- Không truy cập file JSON trực tiếp trong nhiều nơi; dùng layer loader chung.
