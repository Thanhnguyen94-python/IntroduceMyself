---
title: Bắt đầu nhanh
description: Từ bộ linh kiện đến robot biết nói chuyện trong 4 bước.
section: start
order: 1
updated: 2026-10-18
---

Joy_chi_cot là robot để bàn chạy firmware **xiaozhi-esp32** trên **ESP32-S3**. Bạn không cần biết lập trình để có một con robot chạy được: chỉ cần lắp đúng dây và nạp firmware ngay trên trình duyệt.

## 1. Chuẩn bị linh kiện

Xem danh sách đầy đủ và các module thay thế ở trang [BOM & linh kiện thay thế](/joy/docs/hardware/bom). Tối thiểu để robot **nói chuyện được** chỉ cần:

- ESP32-S3 có PSRAM (vd N16R8)
- Micro I2S (ICS-43434 hoặc INMP441)
- Ampli I2S MAX98357A + loa 4–8 Ω
- Màn OLED SSD1306 (để hiện mã QR cài Wi-Fi)

Servo đầu, motor bánh xe, thẻ SD và cảm biến có thể lắp sau.

## 2. Đấu dây

Làm theo bảng chân ở trang [Sơ đồ đấu dây](/joy/docs/hardware/wiring).

> [!WARNING]
> Luôn nối **chung GND** giữa ESP32 và mọi nguồn ngoài. Không cấp servo/motor từ chân 3V3 của ESP32.

## 3. Nạp firmware

1. Mở trang [Nạp firmware](/joy/flash) bằng **Chrome** hoặc **Edge** trên máy tính.
2. Cắm ESP32-S3 vào máy tính bằng cáp USB **có dây dữ liệu**.
3. Bấm **Nạp firmware** → chọn cổng COM → **Install**.
4. Robot mới: tick **Erase device**. Robot đang dùng chỉ cập nhật: **không** tick để giữ Wi-Fi và cài đặt.

## 4. Kết nối Wi-Fi và gọi robot

1. Màn hình hiện mã QR “Quet QR de cai Wi-Fi”: quét bằng điện thoại để vào Wi-Fi của robot (tên dạng `Xiaozhi-XXXX`).
2. Trang cấu hình tự bật lên; nếu không, mở `http://192.168.4.1`.
3. Chọn Wi-Fi nhà bạn, nhập mật khẩu, bấm kết nối.
4. Kết nối xong, màn hình hiện QR của **WebUI**: quét để mở trang điều khiển robot.
5. Nói **“Hi Joy”** (đọc “hai joi”). Robot đáp lại là bắt đầu trò chuyện được.

> [!TIP]
> Các lần sau không cần cắm cáp: mở WebUI → **Cài đặt** → **⬆️ Cập nhật firmware** → **Kiểm tra bản mới**.

## Gặp lỗi?

- Servo lắc/gật đầu sai, bánh xe quay ngược: xem [Đấu nhầm Servo & Motor](/joy/docs/troubleshooting/servo-motor).
- Loa rè, nhỏ, tự reset khi phát to: xem [Module âm thanh MAX98357A](/joy/docs/hardware/audio-max98357a).
- Không nạp được: xem [Lỗi nạp firmware](/joy/docs/troubleshooting/flashing).
