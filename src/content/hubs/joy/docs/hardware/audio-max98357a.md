---
title: Module âm thanh MAX98357A
description: Cấu hình chân SD, GAIN, nguồn và các lỗi loa thường gặp.
section: hardware
order: 3
updated: 2026-10-18
---

MAX98357A là ampli Class-D nhận tín hiệu số I2S trực tiếp từ ESP32-S3, không cần DAC rời. Firmware Joy_chi_cot xuất âm thanh **mono ở kênh trái** (`I2S_STD_SLOT_LEFT`), nên module phải được cấu hình để phát kênh trái.

## Sơ đồ nối chuẩn

| Chân MAX98357A | Nối vào | Giải thích |
|---|---|---|
| `VIN` | 5 V | Chạy được 2.5–5.5 V, nhưng 5 V cho âm lượng lớn nhất (~3 W @ 4 Ω) |
| `GND` | GND chung | |
| `DIN` | GPIO7 | Dữ liệu âm thanh |
| `BCLK` | GPIO15 | Xung bit |
| `LRC` | GPIO16 | Chọn kênh trái/phải (word select) |
| `SD` | **VIN** (trực tiếp hoặc qua trở 10 kΩ) | Bật ampli + chọn **kênh trái** |
| `GAIN` | **GND** | Độ lợi 12 dB |
| `+` / `−` | 2 đầu loa | **Không** nối đầu nào xuống GND |

## Chân SD: bật ampli và chọn kênh

Chân `SD` vừa là chân tắt/mở, vừa chọn kênh theo **mức điện áp** đặt vào nó:

| Điện áp chân SD | Chế độ |
|---|---|
| < 0.16 V | Tắt (shutdown), loa im |
| 0.16–0.77 V | Trộn (Trái + Phải) / 2 |
| 0.77–1.4 V | Kênh phải |
| > 1.4 V | **Kênh trái** ← cần cho Joy_chi_cot |

Nối `SD` lên `VIN` đẩy điện áp lên trên 1.4 V nên ampli phát kênh trái, đúng với firmware.

> [!TIP]
> **Khi nào cần trở 10 kΩ?** Nếu module của bạn **không có** trở kéo sẵn trên chân SD, hoặc bạn thấy loa lúc kêu lúc không, hãy nối `SD` lên `VIN` qua một trở 10 kΩ. Bên trong chip đã có trở kéo xuống ~100 kΩ, nên điện áp SD vẫn đạt khoảng 4.5 V (với VIN = 5 V): vẫn là kênh trái nhưng an toàn hơn khi đi dây dài.

Nếu để chân SD **thả nổi** trên một số module rẻ, điện áp rơi vào vùng “trộn” hoặc “kênh phải”: loa nhỏ hơn một nửa hoặc im hẳn.

## Chân GAIN: chỉnh độ lợi

| Nối chân GAIN | Độ lợi |
|---|---|
| Qua trở 100 kΩ xuống GND | 15 dB |
| **GND** (khuyến nghị) | **12 dB** |
| Để trống | 9 dB |
| VIN | 6 dB |
| Qua trở 100 kΩ lên VIN | 3 dB |

12 dB là mức cân bằng giữa âm lượng và độ méo. Nếu tiếng bị rè khi vặn to, giảm xuống 9 dB (để trống) và tăng âm lượng trong WebUI.

## Cảnh báo về loa

> [!DANGER]
> **Không mắc song song 2 loa** vào một MAX98357A. Hai loa 4 Ω song song còn 2 Ω, thấp hơn mức tối thiểu của chip: ampli quá dòng, nóng, tự ngắt hoặc hỏng. Muốn 2 loa, dùng **2 module MAX98357A** (một module SD→VIN cho kênh trái; module còn lại cũng phát kênh trái vì firmware chỉ xuất mono).

> [!WARNING]
> Đầu ra MAX98357A là kiểu cầu (BTL): **cả 2 đầu `+` và `−` đều có tín hiệu**. Không nối đầu `−` xuống GND như ampli thường, không nối đầu ra vào jack 3.5 mm của loa có nguồn.

## Lỗi thường gặp

| Hiện tượng | Nguyên nhân hay gặp | Cách sửa |
|---|---|---|
| Loa im hoàn toàn | SD nối GND / thả nổi; sai chân DIN | Nối SD → VIN; kiểm tra DIN = GPIO7 |
| Loa nhỏ, như nói từ xa | SD rơi vào chế độ “trộn” | Nối SD thẳng lên VIN hoặc qua 10 kΩ |
| Rè, méo khi to | Gain cao + nguồn yếu | Gain để trống (9 dB), dùng nguồn 5 V ≥ 2 A |
| ESP32 tự reset khi phát to | Sụt áp nguồn | Thêm tụ 470–1000 µF sát chân VIN của ampli, nguồn riêng cho ampli |
| Tiếng “bụp” khi bật | Bình thường với Class-D | Có thể bỏ qua, hoặc điều khiển SD bằng GPIO (cần sửa code) |
| Rít/ù liên tục | Dây I2S dài, không chung GND | Dây I2S < 15 cm, nối GND chung ngắn nhất có thể |
