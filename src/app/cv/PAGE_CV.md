# Trang CV (`/cv`)

## Mục tiêu
Sinh CV động từ dữ liệu JSON hiện tại.

## Cách hoạt động
- Đọc dữ liệu từ `content/pages/site.json` và `content/experience/experience.json`.
- Có bộ chọn `Mẫu CV` và `Màu chủ đạo` để xem trước nhiều kiểu trình bày.
- Có thêm chọn ngôn ngữ `vi/en` để xuất đúng nội dung đa ngôn ngữ.
- Bấm `Xuất PDF` sẽ yêu cầu mật khẩu xác nhận trước khi thêm query `print=1` và gọi hộp thoại in/lưu PDF.
- Hỗ trợ deep-link: `/cv?template=midnight&palette=blue&lang=en&print=1`.

## Mẫu hiện có
- `midnight`: sidebar tối, phù hợp CV kỹ thuật.
- `mint`: sáng, trung tính, kiểu CV văn phòng.
- `sunrise`: nhấn màu cam/vàng, nổi bật phần tiêu đề.
- `clean`: tối giản một cột, thân thiện ATS.

## Tính năng V3
- Chỉnh avatar: URL, upload ảnh, vị trí X/Y, kích thước, bo góc.
- Chỉnh text nhanh: tên, chức danh, mục tiêu, email, phone, location.
- Bật/tắt từng khối nội dung (`summary`, `highlights`, `work`, `education`, `skills`, `tools`).
- Thêm/xóa `custom section` trực tiếp trước khi xuất.
- Xác nhận mật khẩu khi xuất PDF.

## Lưu ý
- Mọi thay đổi CV nên cập nhật dữ liệu nguồn trước, không sửa cứng trong JSX.
- Kinh nghiệm làm việc trên CV chỉ lấy giai đoạn đi làm; mục học tập tách riêng phần `Học vấn`.
