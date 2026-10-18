---
title: Đấu nhầm Servo & Motor
description: Cách nhận biết và sửa khi đảo Pan/Tilt hoặc bánh xe quay ngược chiều, bằng đảo dây hoặc sửa config.h.
section: troubleshooting
order: 1
updated: 2026-10-18
---

Đây là hai lỗi lắp ráp hay gặp nhất. Mỗi lỗi có **2 cách sửa**:

- **Cách A: đảo dây.** Dùng được ngay, kể cả khi bạn nạp firmware từ trang web.
- **Cách B: sửa `config.h`.** Không cần tháo dây, nhưng phải **tự build** lại firmware từ mã nguồn.

> [!NOTE]
> Nếu bạn nạp firmware qua trang [Nạp firmware](/joy/flash), firmware đã build sẵn theo chân chuẩn, nên **chỉ dùng được cách A**.

## Servo Pan (lắc đầu) và Tilt (gật đầu) bị đảo

### Nhận biết

Mở WebUI hoặc nói “gật đầu đi”, “lắc đầu đi” và quan sát:

| Bạn ra lệnh | Đúng | Nếu thấy thế này → bị đảo |
|---|---|---|
| Gật đầu (nod) | Đầu cúi lên/xuống | Đầu quay trái/phải |
| Lắc đầu (shake) | Đầu quay trái/phải | Đầu cúi lên/xuống |

Firmware quy ước: **Pan = GPIO1**, **Tilt = GPIO2**.

### Cách A: đảo dây tín hiệu

1. Rút nguồn robot.
2. Hoán đổi **dây tín hiệu** (màu cam hoặc vàng) của hai servo: dây đang ở GPIO1 chuyển sang GPIO2 và ngược lại.
3. Dây đỏ (5 V) và nâu/đen (GND) giữ nguyên.
4. Cấp nguồn, thử lại lệnh gật/lắc đầu.

### Cách B: sửa config.h

Mở `main/boards/bread-compact-wifi/config.h`, tìm đoạn:

```cpp
// Head servos (khớp cổ 2 trục pan-tilt)
#define HEAD_SERVO_PAN_GPIO  GPIO_NUM_1
#define HEAD_SERVO_TILT_GPIO GPIO_NUM_2
```

Đổi thành:

```cpp
// Head servos (khớp cổ 2 trục pan-tilt) - đã đảo theo dây thực tế
#define HEAD_SERVO_PAN_GPIO  GPIO_NUM_2
#define HEAD_SERVO_TILT_GPIO GPIO_NUM_1
```

Build và nạp lại:

```bash
idf.py build
idf.py -p COM5 flash monitor
```

### Servo quay đúng trục nhưng lệch tâm hoặc ngược hướng

- **Lệch tâm** (đứng yên mà đầu vẫn nghiêng): bật robot, dùng WebUI đưa đầu về giữa (góc 90°), tháo sừng servo ra rồi **lắp lại thẳng**.
- **Ngược hướng** (bảo nhìn trái lại nhìn phải): servo đang lắp ngược mặt. Xoay mặt lắp servo 180° trên khung. Firmware hiện **chưa có** cờ đảo chiều cho servo, nên cách sửa là cơ khí.

## Motor bánh xe quay ngược chiều

### Nhận biết

Bấm **Tiến** trên WebUI và quan sát:

| Hiện tượng | Nguyên nhân | Sửa |
|---|---|---|
| Robot **đi lùi** | Cả 2 motor đấu ngược | Đảo dây cả 2 motor, hoặc bật cờ đảo chiều cả 2 bên |
| Robot **xoay tròn** tại chỗ | 1 motor đấu ngược | Tìm bánh quay lùi, đảo dây motor đó |
| Tiến đúng nhưng **rẽ trái thành rẽ phải** | Motor trái/phải bị đổi chỗ | Đổi chỗ 2 motor giữa kênh A và B |

Quy ước chân: **trái** = GPIO9 (`IN1`) + GPIO8 (`IN2`), **phải** = GPIO11 (`IN1`) + GPIO17 (`IN2`).

### Cách A: đảo dây motor

1. Rút nguồn.
2. Ở driver, hoán đổi **2 dây của motor bị ngược** tại cọc ra: `AO1 ↔ AO2` (bánh trái) hoặc `BO1 ↔ BO2` (bánh phải).
3. Không cần đụng vào dây GPIO.

### Cách B1: đảo chân IN trong config.h

Ví dụ bánh **trái** quay ngược, đổi IN1 và IN2 của bánh trái:

```cpp
// Trước
#define WHEEL_MOTOR_LEFT_IN1_GPIO   GPIO_NUM_9
#define WHEEL_MOTOR_LEFT_IN2_GPIO   GPIO_NUM_8

// Sau: đảo chiều bánh trái
#define WHEEL_MOTOR_LEFT_IN1_GPIO   GPIO_NUM_8
#define WHEEL_MOTOR_LEFT_IN2_GPIO   GPIO_NUM_9
```

Motor trái/phải bị đổi chỗ thì hoán đổi cả nhóm chân:

```cpp
#define WHEEL_MOTOR_LEFT_IN1_GPIO   GPIO_NUM_11
#define WHEEL_MOTOR_LEFT_IN2_GPIO   GPIO_NUM_17
#define WHEEL_MOTOR_RIGHT_IN1_GPIO  GPIO_NUM_9
#define WHEEL_MOTOR_RIGHT_IN2_GPIO  GPIO_NUM_8
```

### Cách B2: dùng cờ đảo chiều có sẵn trong code

Bộ điều khiển `DualDcMotorController` đã hỗ trợ sẵn 2 tham số `left_invert` và `right_invert`. Trong `compact_wifi_board.cc`, thêm 2 giá trị cuối khi khởi tạo:

```cpp
wheel_motor_ = new DualDcMotorController(
    WHEEL_MOTOR_LEFT_IN1_GPIO,
    WHEEL_MOTOR_LEFT_IN2_GPIO,
    WHEEL_MOTOR_RIGHT_IN1_GPIO,
    WHEEL_MOTOR_RIGHT_IN2_GPIO,
    {"self.robot.wheels"},
    true,   // left_invert: đảo chiều bánh trái
    false); // right_invert: giữ nguyên bánh phải
```

Cách này giữ `config.h` đúng với sơ đồ chuẩn, chỉ ghi chú ở một chỗ, dễ đọc lại sau này.

> [!TIP]
> Sau khi sửa, kiểm tra theo thứ tự: **Tiến → Lùi → Rẽ trái → Rẽ phải**. Nếu tiến/lùi đúng mà rẽ sai, lỗi nằm ở việc đổi chỗ trái/phải chứ không phải chiều quay.

## Motor không quay, hoặc chỉ quay một chiều

| Hiện tượng | Kiểm tra |
|---|---|
| Không bánh nào quay | TB6612: `STBY`, `PWMA`, `PWMB` đã nối 3.3 V chưa? DRV8833: chân `nSLEEP` đã kéo lên chưa? L298N: còn jumper `ENA/ENB` không? |
| Chỉ quay 1 chiều | 1 trong 2 dây IN bị lỏng, đo lại GPIO8/9 hoặc 11/17 |
| Quay yếu, robot reset khi khởi động | Nguồn motor chung với ESP32 và bị sụt áp: dùng nguồn riêng, thêm tụ 470 µF |
| Robot tự dừng khi gần mép bàn | Bình thường: cảm biến an toàn đang chặn, xem tab **Cảm biến** trên WebUI |
