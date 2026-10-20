import { seedGroup } from "@/lib/handbook/seed/helper";

export const PRODUCTIVITY = seedGroup("productivity", [
  {
    slug: "oee",
    symbol: "OEE",
    vi: "OEE – hiệu suất thiết bị tổng thể",
    en: "Overall Equipment Effectiveness",
    summary: "Gộp 3 loại tổn thất: dừng máy, chạy chậm, làm ra lỗi. World-class ≈ 85%.",
    formula: "OEE = Availability × Performance × Quality\nA = (Kế hoạch − Dừng) / Kế hoạch\nP = (CT chuẩn × Sản lượng) / Thời gian chạy\nQ = Đạt lần đầu / Sản lượng",
    unit: "%",
    thresholds: [
      ["good", "≥ 85%", "World-class (A ≥ 90%, P ≥ 95%, Q ≥ 99,9%)"],
      ["warning", "60 – 85%", "Phổ biến ở line đa model, nhiều changeover"],
      ["critical", "< 60%", "Tổn thất lớn – xem thành phần nào thấp nhất"]
    ],
    body: `
### Đọc OEE thế nào
Luôn tách 3 thành phần: OEE 75% do **A thấp** (dừng máy, đổi model) xử lý khác hẳn OEE 75% do **P thấp** (chạy chậm, dừng vặt).

### 6 tổn thất lớn (Six Big Losses)
| Thành phần | Tổn thất |
|---|---|
| Availability | Hỏng máy · Chuẩn bị / đổi model |
| Performance | Dừng vặt (feeder kẹt, nozzle bẩn) · Chạy dưới tốc độ chuẩn |
| Quality | Lỗi & sửa · Hao hụt khi khởi động |

### Bẫy thường gặp
- **CT chuẩn** phải là CT lý tưởng của *trạm chậm nhất* theo chương trình. Khai CT chuẩn quá lớn → Performance > 100% (sai).
- Thời gian kế hoạch đã trừ nghỉ ăn, họp có kế hoạch; *không* trừ thời gian đổi model (đó là tổn thất).
`,
    tags: ["TPM", "availability", "performance", "six big losses"],
    related: ["takt-time", "line-balance", "changeover-smed", "mtbf-mttr", "fpy"],
    references: ["Nakajima – TPM"],
    calculator: "oee"
  },
  {
    slug: "takt-time",
    symbol: "Takt",
    vi: "Takt time – nhịp sản xuất",
    en: "Takt time",
    summary: "Nhịp mà khách hàng “kéo” sản phẩm. Trạm nào có cycle time > takt là trạm không đáp ứng nhu cầu.",
    formula: "Takt = Thời gian sản xuất có sẵn / Nhu cầu khách hàng",
    unit: "giây / board",
    body: `
### Ví dụ
Ca 450 phút (27.000 s), khách cần 900 board/ca → Takt = 27.000 / 900 = **30 s/board**.

### Takt vs Cycle time
- **Takt** do khách hàng quyết định (nhu cầu).
- **Cycle time** do quy trình quyết định (máy, chương trình).
- Mục tiêu: CT trạm chậm nhất ≤ Takt, và nên chừa 10–15% cho tổn thất OEE.

### Với panel nhiều board
Nếu panel 4 board, CT tính theo panel thì so sánh với Takt × 4.
`,
    tags: ["lean", "nhịp", "nhu cầu"],
    related: ["cycle-time", "line-balance", "uph-cph"],
    calculator: "takt"
  },
  {
    slug: "cycle-time",
    symbol: "CT",
    vi: "Cycle time – thời gian chu kỳ",
    en: "Cycle time",
    summary: "Thời gian 1 board (panel) đi qua 1 trạm, từ lúc vào đến lúc trạm sẵn sàng nhận board kế tiếp.",
    unit: "giây",
    body: `
### Các loại CT cần phân biệt
- **CT lý thuyết**: máy tính từ chương trình (tối ưu đường đi head).
- **CT thực tế**: đo bằng đồng hồ / log máy – gồm chuyền board vào/ra, nhận dạng fiducial, chờ.
- **CT line**: CT của trạm chậm nhất (bottleneck).

### Cách đo CT trạm cho line balance
1. Đo ≥ 10 board liên tiếp, bỏ board đầu.
2. Đo từ *board vào* trạm này đến *board vào* trạm này lần kế tiếp (gồm cả chuyền).
3. Ghi riêng thời gian chờ (do trạm trước / sau) để không tính nhầm.
`,
    tags: ["thời gian chu kỳ", "bottleneck"],
    related: ["takt-time", "line-balance", "uph-cph"]
  },
  {
    slug: "line-balance",
    symbol: "LBR",
    vi: "Line balance – hiệu suất cân bằng chuyền",
    en: "Line balance efficiency",
    summary: "Mức độ đồng đều CT giữa các trạm. Trạm chậm nhất (bottleneck) quyết định sản lượng cả line.",
    formula: "LBR = Σ CT các trạm / (Số trạm × CT lớn nhất) × 100%\nBalance loss = 1 − LBR",
    unit: "%",
    thresholds: [
      ["good", "≥ 85%", "Cân bằng tốt"],
      ["warning", "70 – 85%", "Có thể chia lại linh kiện giữa các máy gắn"],
      ["critical", "< 70%", "Lãng phí lớn ở các trạm chờ"]
    ],
    body: `
### Cách cải thiện ở line SMT
- **Chia lại linh kiện** giữa các mounter (chip nhỏ cho máy tốc độ cao, IC lớn cho máy đa năng).
- Tối ưu thứ tự gắn / số nozzle trên head.
- Nếu printer là bottleneck: in 2 lần qua (dual lane), giảm số lần lau stencil hoặc tối ưu tốc độ gạt.
- Reflow hiếm khi là bottleneck (chỉ phụ thuộc tốc độ băng tải & khoảng cách board).

> [!TIP]
> Cải thiện trạm *không phải* bottleneck không làm tăng sản lượng – chỉ làm tăng thời gian chờ.
`,
    tags: ["bottleneck", "cân bằng chuyền", "lean"],
    related: ["cycle-time", "takt-time", "uph-cph"]
  },
  {
    slug: "uph-cph",
    symbol: "UPH",
    vi: "UPH / CPH – năng suất theo giờ",
    en: "Units / Components per hour",
    summary: "UPH = số board/giờ của line; CPH = số linh kiện gắn/giờ của máy. CPH catalog luôn cao hơn thực tế.",
    formula: "UPH = 3600 / CT bottleneck (s) × số board trên panel\nCPH thực tế = Số linh kiện / board × UPH (của máy đó)",
    body: `
### CPH catalog vs thực tế
CPH hãng công bố đo trong điều kiện tối ưu (chip nhỏ, đường đi ngắn – IPC-9850). Thực tế thường chỉ đạt **50–70%** do: nhận dạng linh kiện lớn, đổi nozzle, linh kiện tray, chuyền board.

### Dùng để làm gì
- Tính năng lực line khi báo giá / lập kế hoạch.
- So sánh hiệu quả chương trình máy giữa các phiên bản tối ưu.
`,
    tags: ["năng suất", "IPC-9850", "capacity"],
    related: ["cycle-time", "line-balance", "oee"],
    references: ["IPC-9850 Surface Mount Placement Equipment Characterization"],
    calculator: "takt"
  },
  {
    slug: "changeover-smed",
    symbol: "SMED",
    vi: "Changeover / SMED – đổi model nhanh",
    en: "Changeover / SMED",
    summary: "Thời gian từ board tốt cuối của model cũ đến board tốt đầu tiên của model mới. Tổn thất lớn nhất ở line đa model.",
    formula: "Changeover time = t(board OK đầu model mới) − t(board OK cuối model cũ)",
    unit: "phút",
    body: `
### Nguyên tắc SMED
1. Tách việc **trong** (phải dừng line) và **ngoài** (làm khi line đang chạy).
2. Chuyển tối đa việc trong → ngoài.
3. Rút gọn cả hai.

### Ví dụ việc chuyển ra ngoài trong SMT
- Chuẩn bị feeder cart / nạp sẵn feeder trên xe set-up offline.
- Kiểm tra vật tư bằng máy quét (verify) trước khi lắp.
- Rã đông, trộn kem, chuẩn bị stencil & support pin theo model.
- Tải chương trình máy, profile lò sẵn.

> [!TIP]
> Quay video 1 lần changeover rồi phân tích từng bước – thường giảm được 30–50% ngay lần đầu.
`,
    tags: ["đổi model", "lean", "setup"],
    related: ["oee", "material-verification", "fai"]
  },
  {
    slug: "mtbf-mttr",
    symbol: "MTBF",
    vi: "MTBF / MTTR – độ tin cậy & khả năng sửa chữa",
    en: "MTBF / MTTR",
    summary: "MTBF: trung bình bao lâu máy hỏng 1 lần. MTTR: trung bình mất bao lâu để sửa xong.",
    formula: "MTBF = Tổng thời gian chạy / Số lần hỏng\nMTTR = Tổng thời gian sửa / Số lần sửa\nAvailability ≈ MTBF / (MTBF + MTTR)",
    unit: "giờ / phút",
    body: `
### Ý nghĩa
- **MTBF tăng** = máy ổn định hơn → nhờ PM tốt, thay linh kiện hao mòn đúng hạn.
- **MTTR giảm** = sửa nhanh hơn → nhờ đào tạo, sẵn phụ tùng, hướng dẫn sửa lỗi.

### Lưu ý khi ghi dữ liệu
Thống nhất “hỏng” là gì (VD dừng > 5 phút cần kỹ thuật can thiệp). Dừng vặt < 5 phút đưa vào tổn thất Performance của OEE.
`,
    tags: ["TPM", "bảo trì", "reliability"],
    related: ["oee", "nozzle-feeder"],
    calculator: "mtbf"
  }
]);
