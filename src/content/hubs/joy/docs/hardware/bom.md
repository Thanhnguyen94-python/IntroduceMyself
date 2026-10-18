---
title: BOM & linh kiện thay thế
description: Danh sách linh kiện chính và các module tương đương có thể dùng thay khi khó mua.
section: hardware
order: 1
updated: 2026-10-18
---

Bảng dưới đây liệt kê linh kiện dùng trong bản thiết kế chuẩn của Joy_chi_cot (board firmware `bread-compact-wifi`). Cột **Bắt buộc** cho biết robot có chạy được khi thiếu linh kiện đó hay không.

## Linh kiện chính

| # | Linh kiện | Số lượng | Bắt buộc | Ghi chú |
|---|---|---|---|---|
| 1 | ESP32-S3 DevKit **N16R8** (16 MB flash, 8 MB PSRAM Octal) | 1 | ✅ | Bản không có PSRAM **không chạy được** |
| 2 | Micro I2S **ICS-43434** hoặc **INMP441** | 1 | ✅ | Cấp 3.3 V, không cấp 5 V |
| 3 | Ampli I2S **MAX98357A** | 1 | ✅ | Xem [cấu hình chi tiết](/joy/docs/hardware/audio-max98357a) |
| 4 | Loa 4–8 Ω, 2–3 W | 1 | ✅ | Chỉ **1 loa** cho mỗi ampli |
| 5 | OLED **SSD1306** 0.96" (128×64) hoặc 0.91" (128×32), I2C | 1 | ✅ | Hiện mặt robot + QR cài Wi-Fi |
| 6 | Driver motor **TB6612FNG** | 1 | ⬜ | Cho 2 bánh xe |
| 7 | Motor DC giảm tốc (N20 hoặc TT 3–6 V) + bánh | 2 | ⬜ | |
| 8 | Servo **SG90** (đầu pan + tilt) | 2 | ⬜ | Khớp cổ 2 trục |
| 9 | Module thẻ micro SD (SPI, 3.3 V) | 1 | ⬜ | Phát nhạc, lưu động tác đầu |
| 10 | Mạch hạ áp 5 V ≥ 3 A (LM2596 / MP1584) | 1 | ✅* | *Bắt buộc khi chạy pin |
| 11 | Pin 2×18650 (7.4 V) + mạch bảo vệ 2S | 1 | ⬜ | Hoặc sạc dự phòng 5 V/2 A |
| 12 | Tụ hoá 470–1000 µF / 10 V | 2 | ✅ | Đặt gần ampli và servo |
| 13 | Công tắc va chạm / cảm biến LM393 | 0–2 | ⬜ | Chống đâm tường |
| 14 | Cảm biến khoảng cách VL6180X (TOF050C) | 0–1 | ⬜ | Chống rơi bàn |
| 15 | Nút cảm ứng TTP223 | 1 | ⬜ | Chạm 2 lần để đánh thức |

> [!IMPORTANT]
> ESP32-S3 phải có **PSRAM**. Firmware dùng PSRAM cho bộ đệm âm thanh và WebUI; bản `N8`, `N16` (không có chữ `R`) sẽ khởi động lỗi.

## Bảng module thay thế tương đương

### Driver motor

| Module | Điện áp motor | Dòng/kênh | Thay được trực tiếp? | Lưu ý khi thay |
|---|---|---|---|---|
| **TB6612FNG** (chuẩn) | 2.5–13.5 V | 1.2 A | — | Nối `STBY`, `PWMA`, `PWMB` lên 3.3 V |
| **DRV8833** | 2.7–10.8 V | 1.5 A | ✅ Có | `AIN1/AIN2/BIN1/BIN2` ↔ IN1/IN2 của từng bánh. Chân `nSLEEP` (EEP) phải kéo lên 3.3 V, nhiều module đã có sẵn trở kéo |
| **MX1508** | 2–10 V | 1.5 A | ✅ Có | Rẻ, nhỏ; 4 chân IN1–IN4 nối như DRV8833 |
| **L298N** | 5–35 V | 2 A | ⚠️ Được | Sụt áp ~2 V nên motor 3–6 V chạy yếu; giữ jumper `ENA/ENB`; nặng và nóng |

Firmware băm xung PWM trực tiếp trên 4 chân IN (`IN1/IN2` mỗi bánh), nên **mọi driver kiểu 2 chân IN mỗi kênh** đều dùng được mà không phải sửa code.

### Micro I2S

| Module | Thay được trực tiếp? | Lưu ý |
|---|---|---|
| **ICS-43434** | — | Chân `SEL`/`LR` nối GND (kênh trái) |
| **INMP441** | ✅ Có | Chân `L/R` nối **GND**. Nối 3.3 V sẽ đọc kênh phải và robot **không nghe thấy** gì |
| SPH0645LM4H | ❌ Không khuyến nghị | Lệch định dạng dữ liệu I2S, phải sửa code driver |
| Mic analog (MAX9814…) | ❌ Không | Firmware chỉ hỗ trợ mic I2S |

### Âm thanh ra

| Module | Thay được trực tiếp? | Lưu ý |
|---|---|---|
| **MAX98357A** (chuẩn) | — | Class-D 3.2 W @ 4 Ω, cấp 5 V |
| **NS4168** | ✅ Có | Cùng kiểu ampli I2S mono, chân `CTRL` thay cho `SD` (kéo lên để bật kênh trái) |
| PCM5102A + PAM8403 | ⚠️ Được | Cần 2 module (DAC + ampli analog), đi dây nhiều hơn, dễ nhiễu |

### Servo

| Module | Thay được trực tiếp? | Lưu ý |
|---|---|---|
| **SG90** (chuẩn) | — | Bánh răng nhựa, ~1.8 kg·cm |
| **MG90S** | ✅ Có | Bánh răng kim loại, khoẻ hơn nhưng hút dòng cao hơn (cần nguồn 5 V ≥ 2 A) |
| ES08MA / EMAX ES08 | ✅ Có | Cùng cỡ 9 g, cùng chuẩn xung 50 Hz |

### Màn hình

| Module | Thay được trực tiếp? | Lưu ý |
|---|---|---|
| SSD1306 0.91" 128×32 | ✅ | Bản firmware `bread-compact-wifi` |
| SSD1306 0.96" 128×64 | ✅ | Bản firmware `bread-compact-wifi-128x64` |
| SH1106 1.3" 128×64 | ⚠️ Phải build lại | Chọn `CONFIG_OLED_SH1106_128X64` trong menuconfig |

> [!NOTE]
> Bản nạp trên web dùng cấu hình chuẩn. Nếu bạn thay linh kiện cần **sửa code** (SH1106, đổi chân GPIO…) thì phải tự build firmware từ mã nguồn xiaozhi-esp32.
