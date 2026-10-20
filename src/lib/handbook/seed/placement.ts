import { seedGroup } from "@/lib/handbook/seed/helper";

export const PLACEMENT = seedGroup("placement", [
  {
    slug: "mispick-rate",
    symbol: "Mispick",
    vi: "Tỉ lệ hút hỏng (Mispick / Pickup error)",
    en: "Mispick / pickup error rate",
    summary: "Số lần hút linh kiện thất bại trên tổng lần hút. Tăng mispick = tốn vật tư, giảm tốc độ, nguy cơ thiếu linh kiện.",
    formula: "Mispick rate = Số lần hút lỗi / Tổng số lần hút × 100%",
    unit: "%",
    thresholds: [
      ["good", "≤ 0,1%", "Tốt"],
      ["warning", "0,1 – 0,3%", "Theo dõi feeder / nozzle cụ thể"],
      ["critical", "> 0,3% (hoặc > 2× mục tiêu)", "Rút feeder / nozzle ra kiểm tra"]
    ],
    body: `
### Phân loại nguyên nhân
| Loại lỗi máy báo | Nguyên nhân thường gặp |
|---|---|
| Pickup error (không hút được) | Feeder bước sai, nắp băng không bóc, nozzle tắc / mòn, sai vị trí hút |
| Recognition error (camera loại) | Linh kiện nghiêng, sai dữ liệu linh kiện, nozzle bẩn phản quang |
| Drop / lost | Chân không yếu, tốc độ head quá cao, linh kiện nặng |

### Cách xử lý
1. Lấy log mispick theo **feeder slot / nozzle** – thường 20% thiết bị gây 80% lỗi.
2. Đổi chéo feeder sang slot khác: lỗi đi theo feeder → feeder hỏng; ở lại slot → vấn đề vị trí máy.
3. Vệ sinh / thay nozzle, kiểm tra lò xo, đầu hút.
`,
    tags: ["pickup", "feeder", "nozzle", "máy gắn"],
    related: ["nozzle-feeder", "placement-accuracy", "mtbf-mttr"],
    references: ["Log máy gắn (Panasonic / Fuji / Yamaha / ASM)"]
  },
  {
    slug: "placement-accuracy",
    symbol: "±µm",
    vi: "Độ chính xác gắn (Placement accuracy)",
    en: "Placement accuracy",
    summary: "Độ lệch vị trí X, Y, góc θ của linh kiện so với tâm pad. Hãng công bố dạng ±µm @ 3σ hoặc Cpk.",
    unit: "µm",
    thresholds: [
      ["info", "±25 – 50 µm @ 3σ", "Dải công bố phổ biến cho chip (theo datasheet máy)"],
      ["warning", "Lệch > 25% chiều rộng chân", "Gần ngưỡng IPC Class 3 (side overhang)"]
    ],
    body: `
### Ảnh hưởng
Reflow có hiệu ứng **tự căn chỉnh** (self-alignment) cho chip nhỏ, nhưng không cứu được linh kiện nặng, QFN, BGA lệch nhiều.

### Kiểm tra định kỳ
- Gắn glass chip trên board kính, đo bằng camera máy → tính Cmk.
- Kiểm tra fiducial: đủ 2–3 fiducial chéo nhau, bề mặt phẳng, không phủ solder mask.

### Nguyên nhân lệch
Hiệu chuẩn head/camera, nozzle mòn, dữ liệu linh kiện (kích thước body) sai, board cong vênh, support pin thiếu.
`,
    tags: ["accuracy", "Cmk", "fiducial", "offset"],
    related: ["cmk", "chip-solder-joint", "pcb-warpage"]
  },
  {
    slug: "nozzle-feeder",
    symbol: "PM",
    vi: "Bảo dưỡng Nozzle & Feeder",
    en: "Nozzle & feeder maintenance",
    summary: "Nozzle và feeder là nguồn gây mispick, lệch gắn, gắn ngược phổ biến nhất. Quản lý theo mã S/N và chu kỳ PM.",
    thresholds: [
      ["info", "Nozzle: vệ sinh hằng ngày/tuần, PM ~1 tháng", "Tuỳ hãng & tần suất dùng"],
      ["info", "Feeder: PM ~3 tháng hoặc theo số bước", "Kiểm tra pitch, lò xo, bánh răng"],
      ["critical", "Quá hạn PM / mispick > 2× mục tiêu", "Khoá không cho lên line"]
    ],
    body: `
### Checklist nozzle
- Đầu nozzle không mẻ, không mòn, không bám flux / bụi.
- Phản quang (mặt đen / trắng) không trầy để camera nhận dạng tốt.
- Kiểm tra lưu lượng chân không bằng thiết bị của hãng.

### Checklist feeder
- Bước đúng pitch (2 / 4 / 8 mm), không rung, cửa sổ hút đúng vị trí.
- Cơ cấu bóc băng nắp (cover tape) kéo đều.
- Gắn nhãn S/N + hạn PM; feeder lỗi gắn tag đỏ, tách khu riêng.

> [!TIP]
> Dùng mẫu **Feeder & Nozzle Health** trong bộ mẫu báo cáo SMT để theo dõi mispick theo từng S/N.
`,
    tags: ["TPM", "feeder", "nozzle", "PM"],
    related: ["mispick-rate", "mtbf-mttr", "material-verification"]
  },
  {
    slug: "material-verification",
    symbol: "Verify",
    vi: "Kiểm tra vật tư khi lên feeder (Material verification)",
    en: "Material verification",
    summary: "Quét mã cuộn linh kiện với mã feeder/slot theo chương trình để chặn lắp sai linh kiện.",
    body: `
### Vì sao quan trọng
**Sai linh kiện (wrong part)** và **ngược cực tính** thường lọt qua AOI nếu linh kiện giống nhau về hình dạng (VD tụ cùng kích thước khác giá trị). Một lần lắp sai cuộn có thể ảnh hưởng cả lô.

### Quy trình tối thiểu
1. Quét **mã cuộn** + **mã feeder** + **slot** → hệ thống so với BOM / chương trình.
2. Khi nối cuộn (splicing): quét cuộn cũ & cuộn mới, kiểm tra cùng mã linh kiện, cùng hướng.
3. Linh kiện có cực tính: kiểm tra hướng trong băng so với dữ liệu máy ở cuộn đầu tiên.
4. Ghi lot linh kiện vào hệ thống để truy xuất (traceability).

### Khi không có MES
Dùng checklist 2 người kiểm tra chéo (operator + leader) và đo giá trị bằng LCR ở board đầu tiên (FAI).
`,
    tags: ["MES", "traceability", "splicing", "wrong part"],
    related: ["fai", "changeover-smed", "4m-change"]
  }
]);
