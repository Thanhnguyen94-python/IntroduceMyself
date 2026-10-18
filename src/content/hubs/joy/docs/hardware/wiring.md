---
title: Sơ đồ đấu dây
description: Bảng chân GPIO đầy đủ theo config.h của board bread-compact-wifi.
section: hardware
order: 2
updated: 2026-10-18
---

Toàn bộ chân bên dưới lấy từ file `main/boards/bread-compact-wifi/config.h` của firmware. Nếu bạn nạp firmware từ trang web, **phải đấu đúng bảng này** vì không sửa được chân sau khi build.
![Sơ đồ đấu dây tổng thể](/assets/images/hubs/joy/wiring.jpg "Hình 1. Sơ đồ đấu dây Joy_chi_cot")

## Nguồn và GND (quan trọng nhất)

- Mọi module nối **chung GND** với ESP32. Thiếu GND chung là nguyên nhân số 1 khiến servo giật, motor chạy loạn.
- GPIO của ESP32-S3 là logic **3.3 V**: không đưa 5 V vào bất kỳ chân GPIO nào.
- Servo, motor và ampli lấy nguồn **5 V riêng** (mạch hạ áp ≥ 3 A), không lấy từ chân 3V3 của ESP32.
- Đặt tụ 470–1000 µF ngay chân nguồn của servo và ampli để tránh sụt áp làm ESP32 tự reset.

## Âm thanh (I2S, chế độ Simplex)

| Module | Chân module | GPIO ESP32-S3 |
|---|---|---|
| Mic I2S | `WS` / `LRCL` | **GPIO4** |
| Mic I2S | `SCK` / `BCLK` | **GPIO5** |
| Mic I2S | `SD` / `DOUT` | **GPIO6** |
| Mic I2S | `L/R` / `SEL` | GND |
| Mic I2S | `VDD` | 3V3 |
| MAX98357A | `DIN` | **GPIO7** |
| MAX98357A | `BCLK` | **GPIO15** |
| MAX98357A | `LRC` | **GPIO16** |
| MAX98357A | `VIN` | 5 V |

Cấu hình `SD` và `GAIN` của MAX98357A xem trang [Module âm thanh](/joy/docs/hardware/audio-max98357a).

## Màn hình OLED (I2C)
![OLED 0.96" I2C](/assets/images/hubs/joy/OLED_096.jpg "Hình 2. Màn hình OLED 0.96 inch I2C")
![OLED 0.91" I2C](/assets/images/hubs/joy/OLED_091.jpg "Hình 2. Màn hình OLED 0.91 inch I2C")
| Chân OLED | GPIO |
|---|---|
| `SDA` | **GPIO41** |
| `SCL` | **GPIO42** |
| `VCC` | 3V3 |

Màn phụ 0.91" (chỉ khi bật chế độ 2 màn): `SDA` → GPIO21, `SCL` → GPIO38. Cảm biến VL6180X dùng chung bus GPIO41/42 (địa chỉ `0x29`).

## Motor bánh xe

| Chức năng | GPIO | Nối vào driver (TB6612 / DRV8833) |
|---|---|---|
| Bánh trái `IN1` | **GPIO9** | `AIN1` |
| Bánh trái `IN2` | **GPIO8** | `AIN2` |
| Bánh phải `IN1` | **GPIO11** | `BIN1` |
| Bánh phải `IN2` | **GPIO17** | `BIN2` |

Motor trái nối `AO1/AO2` (hoặc `OUT1/OUT2`), motor phải nối `BO1/BO2`. Driver `VM` nối nguồn motor, `VCC` nối 3V3.

## Servo đầu (pan-tilt)

| Servo | Dây tín hiệu (cam/vàng) | Nguồn |
|---|---|---|
| **Pan**: lắc đầu trái ↔ phải | **GPIO1** | 5 V ngoài |
| **Tilt**: gật đầu lên ↔ xuống | **GPIO2** | 5 V ngoài |

Dây nâu/đen của servo nối GND chung, dây đỏ nối 5 V.

## Thẻ SD (SPI)

| Chân module | GPIO |
|---|---|
| `MISO` | GPIO12 |
| `MOSI` | GPIO13 |
| `SCK` | GPIO14 |
| `CS` | GPIO10 |

## Nút bấm, LED, cảm biến

| Chức năng | GPIO |
|---|---|
| Nút BOOT (onboard) | GPIO0 |
| Nút cảm ứng (chạm 2 lần để đánh thức) | GPIO47 |
| LED onboard | GPIO48 |
| Đầu thu RC SBUS (tuỳ chọn) | GPIO19 |
| Cảm biến va chạm LM393 (chọn trên WebUI) | GPIO3, 18, 20, 39, 40 |

> [!DANGER]
> Không dùng **GPIO45, GPIO46** (chân strapping: module kéo lên HIGH sẽ làm lỗi khởi động/nạp), **GPIO26–37** (flash/PSRAM) và **GPIO43/44** (UART nạp và log).
