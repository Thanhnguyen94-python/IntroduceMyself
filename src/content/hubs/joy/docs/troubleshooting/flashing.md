---
title: Lỗi nạp firmware
description: Không thấy cổng COM, lỗi mở cổng, nạp xong không chạy.
section: troubleshooting
order: 2
updated: 2026-10-18
---

## Trình duyệt không hiện nút nạp

- Chỉ **Chrome** và **Edge** trên **máy tính** hỗ trợ Web Serial. Firefox, Safari và trình duyệt điện thoại không dùng được.
- Trang phải mở qua `https://` (hoặc `localhost` khi chạy thử).

## Không thấy cổng COM trong danh sách

1. Đổi cáp USB khác: rất nhiều cáp chỉ có dây sạc, không có dây dữ liệu.
2. Cắm vào cổng **USB** (không phải cổng `UART`) nếu board có 2 cổng USB-C.
3. Windows 10 cũ: cài driver **CH340/CH343** hoặc **CP210x** tuỳ chip USB trên board.

## “Failed to open serial port”

- Đóng mọi chương trình đang giữ cổng COM: Serial Monitor của Arduino IDE, `idf.py monitor`, PuTTY…
- Vẫn lỗi: **giữ nút BOOT → nhấn RESET → thả BOOT**, rồi bấm nạp lại. Thao tác này ép ESP32 vào chế độ nạp.

## Nạp xong nhưng robot không chạy

| Hiện tượng | Cách xử lý |
|---|---|
| Màn hình tối, không có gì | Kiểm tra dây OLED (GPIO41/42) và loại màn đúng bản firmware (128×32 hay 128×64) |
| Khởi động lại liên tục | Board không có PSRAM, hoặc nguồn yếu: xem [BOM](/joy/docs/hardware/bom) |
| Không đáp lại “Hi Joy” | Mở WebUI → Cài đặt → Cập nhật firmware: nếu báo “dữ liệu giọng nói bị lỗi” thì nạp lại và tick **Erase device** |
| Mất Wi-Fi sau khi nạp | Do đã tick Erase device: cài lại Wi-Fi theo [Bắt đầu nhanh](/joy/docs/start/quick-start) |
