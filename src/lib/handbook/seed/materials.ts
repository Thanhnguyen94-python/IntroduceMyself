import { seedGroup } from "@/lib/handbook/seed/helper";

export const MATERIALS = seedGroup("materials", [
  {
    slug: "msl",
    symbol: "MSL",
    vi: "MSL – mức nhạy ẩm & thời gian sàn",
    en: "Moisture Sensitivity Level & floor life",
    summary: "Linh kiện nhựa hút ẩm; khi reflow hơi nước giãn nở gây nứt, phồng (popcorn). MSL quy định được để ngoài bao bao lâu.",
    unit: "giờ (≤ 30 °C / 60% RH)",
    thresholds: [
      ["good", "MSL 1", "Không giới hạn (≤ 30 °C / 85% RH)"],
      ["info", "MSL 2", "1 năm"],
      ["info", "MSL 2a", "4 tuần"],
      ["warning", "MSL 3", "168 giờ (7 ngày)"],
      ["warning", "MSL 4", "72 giờ"],
      ["critical", "MSL 5", "48 giờ"],
      ["critical", "MSL 5a", "24 giờ"],
      ["critical", "MSL 6", "Phải sấy trước khi dùng; dùng trong thời gian ghi trên nhãn"]
    ],
    body: `
### Quy trình kiểm soát
1. Kiểm tra túi chống ẩm (MBB) còn kín, đọc **thẻ chỉ thị ẩm (HIC)** theo hướng dẫn in trên thẻ.
2. Khi mở túi: ghi **giờ mở** lên nhãn / hệ thống.
3. Cộng dồn thời gian ngoài túi; cất tủ khô (≤ 5–10% RH) thì có thể tạm dừng / phục hồi đồng hồ theo J-STD-033.
4. Hết thời gian sàn → **sấy** trước khi dùng.

> [!WARNING]
> Linh kiện BGA, QFN lớn, LED thường là MSL 3 trở lên. Lỗi do ẩm thường không thấy ngay mà lộ ra ở khách hàng (nứt trong thân, delamination).
`,
    tags: ["J-STD-033", "J-STD-020", "độ ẩm", "popcorn", "floor life"],
    related: ["baking", "room-environment", "peak-temperature"],
    references: ["IPC/JEDEC J-STD-020", "IPC/JEDEC J-STD-033"],
    calculator: "msl"
  },
  {
    slug: "baking",
    symbol: "Bake",
    vi: "Sấy linh kiện (Baking)",
    en: "Component baking",
    summary: "Sấy để đuổi ẩm khi linh kiện quá thời gian sàn MSL hoặc HIC báo ẩm.",
    thresholds: [
      ["info", "125 °C", "Nhanh nhất – chỉ cho khay chịu nhiệt (tray chịu 125 °C)"],
      ["info", "90 °C ≤ 5% RH / 40 °C ≤ 5% RH", "Cho cuộn băng nhựa – thời gian dài (nhiều ngày ở 40 °C)"]
    ],
    body: `
### Nguyên tắc
- Thời gian sấy tra **bảng J-STD-033** theo *mức MSL* và *độ dày thân linh kiện*.
- **Không sấy cuộn băng nhựa ở 125 °C** – băng / cuộn chảy biến dạng. Chuyển sang khay chịu nhiệt hoặc dùng nhiệt độ thấp.
- Sấy nhiều lần làm **oxy hoá chân linh kiện** → khó hàn; ghi số lần sấy, giới hạn theo spec.
- Sau sấy: thời gian sàn được tính lại từ đầu.
`,
    tags: ["J-STD-033", "MSL", "sấy"],
    related: ["msl"],
    references: ["IPC/JEDEC J-STD-033"]
  },
  {
    slug: "esd",
    symbol: "ESD",
    vi: "Chống tĩnh điện (ESD)",
    en: "Electrostatic discharge control",
    summary: "Phóng tĩnh điện làm hỏng linh kiện ngay hoặc hỏng tiềm ẩn. Kiểm soát theo ANSI/ESD S20.20 hoặc IEC 61340-5-1.",
    thresholds: [
      ["good", "Hệ người – vòng tay – đất < 3,5 × 10⁷ Ω (35 MΩ)", "Kiểm tra vòng tay mỗi đầu ca"],
      ["good", "Mặt bàn – đất < 1 × 10⁹ Ω", ""],
      ["info", "Vòng tay có điện trở an toàn ~1 MΩ", "Bảo vệ người khi chạm điện"]
    ],
    body: `
### Kiểm tra hằng ngày
- Vòng tay / giày ESD: kiểm tra bằng máy test, ghi sổ đạt/không đạt.
- Ionizer cho vùng không thể nối đất (nhựa, màng bọc).
- Không mang vật cách điện (túi nilon, cốc nhựa, giấy thường) vào EPA.

### Đánh dấu
Khu vực EPA có biển báo; linh kiện / board nhạy ESD để trong túi chắn tĩnh điện (shielding bag), khay dẫn điện.
`,
    tags: ["S20.20", "IEC 61340", "tĩnh điện", "EPA"],
    related: ["room-environment"],
    references: ["ANSI/ESD S20.20", "IEC 61340-5-1"]
  },
  {
    slug: "room-environment",
    symbol: "°C / %RH",
    vi: "Môi trường phòng SMT (nhiệt độ, độ ẩm)",
    en: "SMT room environment",
    summary: "Nhiệt độ & độ ẩm ảnh hưởng độ nhớt kem hàn, tĩnh điện, hút ẩm linh kiện.",
    thresholds: [
      ["good", "~22 – 28 °C, 40 – 60% RH", "Dải phổ biến – chốt theo datasheet kem & yêu cầu khách"],
      ["warning", "RH < 30%", "Tăng nguy cơ tĩnh điện, kem khô nhanh"],
      ["warning", "RH > 60–70%", "Kem hút ẩm → bi thiếc, slump; linh kiện MSL hút ẩm nhanh"]
    ],
    body: `
- Đặt data logger nhiệt độ / độ ẩm gần printer (nơi nhạy nhất), ghi liên tục.
- Đặt ngưỡng cảnh báo; khi vượt ngưỡng ghi vào nhật ký 4M (Environment) và đánh giá ảnh hưởng.
- Gió điều hoà không thổi trực tiếp vào stencil (làm khô kem).
`,
    tags: ["độ ẩm", "nhiệt độ", "môi trường", "4M"],
    related: ["solder-paste-handling", "esd", "msl", "4m-change"]
  },
  {
    slug: "pcb-warpage",
    symbol: "Bow/Twist",
    vi: "Cong vênh PCB (Bow & Twist)",
    en: "PCB bow & twist",
    summary: "PCB cong làm in kem không đều, gắn lệch, BGA hở / head-in-pillow. IPC giới hạn 0,75% cho board SMT.",
    formula: "Bow / Twist (%) = Độ cong lớn nhất / Chiều dài cạnh (hoặc đường chéo) × 100%",
    unit: "%",
    thresholds: [
      ["good", "≤ 0,75%", "Board có linh kiện SMT (IPC-6012 / IPC-A-600)"],
      ["warning", "≤ 1,5%", "Chỉ cho board không có SMT"]
    ],
    body: `
### Phòng ngừa
- Kiểm tra khi nhập PCB (đặt trên mặt phẳng, đo khe hở bằng thước lá).
- Bảo quản PCB nằm phẳng, đúng hạn sử dụng, sấy PCB nếu ẩm theo spec.
- Dùng support pin / jig đỡ khi in và gắn; dùng carrier cho board mỏng.
- Board 2 mặt: chú ý cong vênh sau lần reflow thứ nhất.
`,
    tags: ["IPC-6012", "IPC-A-600", "warpage", "head-in-pillow"],
    related: ["placement-accuracy", "bga-voiding"],
    references: ["IPC-6012", "IPC-A-600", "IPC-TM-650 2.4.22"]
  },
  {
    slug: "flux-classification",
    symbol: "ROL0",
    vi: "Phân loại flux (J-STD-004)",
    en: "Flux classification (J-STD-004)",
    summary: "Mã 4 ký tự cho biết gốc flux, độ hoạt tính và có halogen hay không. No-clean SMT phổ biến là ROL0 / REL0.",
    body: `
### Đọc mã flux
| Ký tự | Ý nghĩa |
|---|---|
| 1–2: RO / RE / OR / IN | Rosin (nhựa thông) / Resin (nhựa tổng hợp) / Organic (hữu cơ) / Inorganic (vô cơ) |
| 3: L / M / H | Hoạt tính thấp / trung bình / cao |
| 4: 0 / 1 | Không / có halide |

Ví dụ: **ROL0** = gốc nhựa thông, hoạt tính thấp, không halide → no-clean, an toàn khi để lại cặn.

### Lưu ý
- Flux hoạt tính cao (H) thường bắt buộc rửa sau hàn.
- Board có yêu cầu độ tin cậy cao: kiểm tra độ sạch ion (ROSE / SIR) theo spec khách.
`,
    tags: ["flux", "no-clean", "J-STD-004", "halide"],
    related: ["paste-type"],
    references: ["IPC J-STD-004"]
  }
]);
