# Trang CV (`/cv`)

## Mục tiêu
Sinh CV động từ dữ liệu JSON hiện tại.

## Cách hoạt động
- Đọc dữ liệu từ `content/pages/site.json` và `content/experience/experience.json`.
- Nếu truy cập `/cv?print=1`, trang tự gọi in để người dùng lưu PDF.

## Lưu ý
- Mọi thay đổi CV nên cập nhật dữ liệu nguồn trước, không sửa cứng trong JSX.
