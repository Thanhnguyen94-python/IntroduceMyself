import { seedGroup } from "@/lib/handbook/seed/helper";

export const QUALITY = seedGroup("quality", [
  {
    slug: "yield",
    symbol: "Yield",
    vi: "Yield – các loại tỉ lệ đạt",
    en: "Yield – types of pass rate",
    summary: "Phân biệt Final Yield, FPY và RTY: cùng gọi là “yield” nhưng nói về những điều rất khác nhau.",
    formula: "Final Yield = Board đạt cuối cùng (kể cả sau sửa) / Board đầu vào\nFPY = Board đạt ngay lần đầu / Board đầu vào\nRTY = FPY₁ × FPY₂ × … × FPYₙ",
    unit: "%",
    thresholds: [
      ["info", "Final Yield ≈ 100%", "Bình thường – gần như mọi board đều sửa được, không nói lên chất lượng quy trình"],
      ["warning", "FPY thấp hơn Final Yield nhiều", "Nhà máy ẩn (hidden factory): tốn công sửa, rủi ro lỗi tiềm ẩn"]
    ],
    body: `
### Ý nghĩa
- **Final Yield** chỉ cho biết bao nhiêu board cuối cùng giao được. Gần như luôn cao vì board lỗi đã được rework.
- **FPY (First Pass Yield)** cho biết quy trình làm đúng *ngay lần đầu* bao nhiêu – đây là con số kỹ sư SMT nên theo dõi.
- **RTY (Rolled Throughput Yield)** nhân FPY của tất cả công đoạn (SMT → THT → ICT → FCT) để thấy xác suất board đi qua cả chuỗi mà không phải sửa lần nào.

### Ví dụ
SMT FPY 98%, AOI/ICT 99%, FCT 97% → RTY = 0,98 × 0,99 × 0,97 ≈ **94,1%**. Tức là cứ 100 board thì ~6 board phải sửa ở đâu đó, dù Final Yield có thể là 99,9%.

> [!TIP]
> Khi báo cáo, luôn ghi rõ đang dùng loại yield nào. “Yield 99,8%” mà là Final Yield thì gần như không có giá trị cải tiến.
`,
    tags: ["FPY", "RTY", "Final yield", "tỉ lệ đạt"],
    related: ["fpy", "rty", "ppm", "dpmo"],
    calculator: "rty"
  },
  {
    slug: "fpy",
    symbol: "FPY",
    vi: "First Pass Yield – tỉ lệ đạt lần đầu",
    en: "First Pass Yield",
    summary: "Tỉ lệ board qua kiểm tra ngay lần đầu, không cần sửa. KPI chất lượng quan trọng nhất của line SMT.",
    formula: "FPY = Board đạt lần đầu / Tổng board kiểm tra × 100%",
    unit: "%",
    thresholds: [
      ["good", "≥ 99%", "Quy trình ổn định (board phức tạp có thể ≥ 98%)"],
      ["warning", "97 – 99%", "Cần xem Pareto lỗi, có thể có 1–2 nguyên nhân chính"],
      ["critical", "< 97%", "Vấn đề hệ thống: in kem, profile, vật tư hoặc chương trình máy"]
    ],
    body: `
### Ý nghĩa
FPY đo năng lực *làm đúng ngay từ đầu*. Mỗi board phải rework là tốn công, tốn thời gian và có thể tạo lỗi tiềm ẩn (nhiệt hàn lại, ứng suất).

### Cách đo
- Lấy tại trạm kiểm tra sau reflow (AOI) hoặc sau cùng của SMT.
- **Board bị AOI báo lỗi nhưng operator xác nhận là báo giả (false call) vẫn tính là đạt**; chỉ board phải sửa thật mới tính là không đạt.
- Đếm theo *board*, không theo *điểm lỗi* (điểm lỗi dùng cho DPMO).

### Lưu ý thực tế
- Ngưỡng tốt phụ thuộc độ phức tạp board: board 2.000 linh kiện có FPY 98% có thể còn tốt hơn board 50 linh kiện FPY 99,5%. Khi so sánh giữa các model, dùng **DPMO**.
- FPY giảm đột ngột sau đổi model / đổi lot vật tư → kiểm tra nhật ký 4M.
`,
    tags: ["yield", "first pass", "tỉ lệ đạt"],
    related: ["yield", "dpmo", "ppm", "aoi-false-call"],
    references: ["Quy ước nội bộ / khách hàng"]
  },
  {
    slug: "rty",
    symbol: "RTY",
    vi: "Rolled Throughput Yield",
    en: "Rolled Throughput Yield",
    summary: "Xác suất 1 sản phẩm đi qua toàn bộ chuỗi công đoạn mà không phải sửa lần nào.",
    formula: "RTY = FPY₁ × FPY₂ × … × FPYₙ",
    unit: "%",
    body: `
### Ý nghĩa
RTY cho thấy “nhà máy ẩn”: chuỗi càng nhiều công đoạn thì RTY càng thấp, dù từng công đoạn trông có vẻ tốt.

### Ví dụ
5 công đoạn, mỗi công đoạn FPY 99% → RTY = 0,99⁵ ≈ **95,1%**.

### Dùng để làm gì
- Chọn công đoạn cần cải tiến trước: công đoạn có FPY thấp nhất kéo RTY xuống nhiều nhất.
- Thuyết phục đầu tư: tăng FPY SMT từ 97% lên 99% có thể tăng RTY nhiều hơn tối ưu FCT.
`,
    tags: ["yield", "throughput"],
    related: ["yield", "fpy"],
    calculator: "rty"
  },
  {
    slug: "dpmo",
    symbol: "DPMO",
    vi: "DPMO – lỗi trên một triệu cơ hội",
    en: "Defects Per Million Opportunities",
    summary: "Số điểm lỗi trên 1 triệu cơ hội lỗi (thường là mối hàn). So sánh được giữa các model khác độ phức tạp.",
    formula: "DPMO = Tổng điểm lỗi / (Số board × Cơ hội lỗi mỗi board) × 1.000.000",
    unit: "ppm cơ hội",
    thresholds: [
      ["good", "< 50", "Line SMT rất tốt"],
      ["warning", "50 – 200", "Mức phổ biến, còn dư địa cải tiến"],
      ["critical", "> 200", "Cần phân tích Pareto & nguyên nhân gốc"]
    ],
    body: `
### Ý nghĩa
FPY phụ thuộc số linh kiện trên board, còn DPMO thì *chuẩn hoá theo độ phức tạp*. Đây là cách công bằng để so sánh line, model, nhà máy.

### Cơ hội lỗi là gì?
Thống nhất 1 cách đếm và giữ nguyên:
- **Theo mối hàn** (phổ biến nhất trong SMT): tụ 0402 = 2, SOIC-8 = 8, BGA 256 bi = 256.
- Hoặc theo linh kiện + mối hàn (IPC-9261 có hướng dẫn chi tiết).

### Ví dụ
10.000 board × 1.200 mối hàn = 12 triệu cơ hội; 300 điểm lỗi → DPMO = 300 / 12.000.000 × 10⁶ = **25**.

> [!WARNING]
> Ngưỡng ở trên chỉ để tham khảo; quan trọng là xu hướng của chính line và cách đếm cơ hội thống nhất.
`,
    tags: ["ppm", "six sigma", "IPC-9261", "mối hàn"],
    related: ["ppm", "sigma-level", "fpy"],
    references: ["IPC-9261 In-Process DPMO and Estimated Yield for PWAs"],
    calculator: "sigma"
  },
  {
    slug: "ppm",
    symbol: "PPM",
    vi: "PPM – phần triệu",
    en: "Parts Per Million",
    summary: "Số sản phẩm lỗi trên 1 triệu sản phẩm. Dùng nhiều trong giao tiếp chất lượng với khách hàng.",
    formula: "PPM = Số sản phẩm lỗi / Tổng sản phẩm × 1.000.000\n1% = 10.000 PPM",
    unit: "ppm",
    body: `
### Phân biệt
- **PPM board (nội bộ)**: board lỗi / tổng board – liên quan trực tiếp FPY: PPM = (1 − FPY) × 10⁶.
- **PPM khách hàng**: sản phẩm lỗi khách phát hiện / số giao. Thường là KPI trong hợp đồng (VD ≤ 50 PPM).
- **DPMO**: tính theo cơ hội lỗi, không phải theo sản phẩm.

### Quy đổi nhanh
| % lỗi | PPM |
|---|---|
| 1% | 10.000 |
| 0,1% | 1.000 |
| 0,01% | 100 |
| 0,001% | 10 |
`,
    tags: ["defect rate", "khách hàng"],
    related: ["dpmo", "fpy"]
  },
  {
    slug: "sigma-level",
    symbol: "σ level",
    vi: "Mức Sigma của quy trình",
    en: "Process sigma level",
    summary: "Quy đổi DPMO sang thang Six Sigma (đã gồm độ dịch 1,5σ dài hạn). 6σ ≈ 3,4 DPMO.",
    formula: "Sigma = Z(1 − DPMO/10⁶) + 1,5",
    thresholds: [
      ["info", "3σ ≈ 66.807 DPMO", "Mức trung bình ngành truyền thống"],
      ["info", "4σ ≈ 6.210 DPMO", ""],
      ["good", "5σ ≈ 233 DPMO", ""],
      ["good", "6σ ≈ 3,4 DPMO", "Mục tiêu Six Sigma"]
    ],
    body: `
### Ý nghĩa
Mức sigma diễn đạt chất lượng bằng một con số dễ so sánh. Quy ước Six Sigma cộng **1,5σ** cho độ trôi dài hạn của quy trình.

### Lưu ý
- Với SMT, DPMO tính theo mối hàn nên mức sigma thường cao (DPMO 25 ≈ 5,6σ). Không so sánh trực tiếp với sigma tính theo sản phẩm.
- Dùng máy tính bên dưới để quy đổi hai chiều.
`,
    tags: ["six sigma", "DPMO"],
    related: ["dpmo", "cp-cpk"],
    calculator: "sigma"
  },
  {
    slug: "cp-cpk",
    symbol: "Cpk",
    vi: "Cp / Cpk – chỉ số năng lực quy trình",
    en: "Process capability Cp / Cpk",
    summary: "Đo xem quy trình có nằm gọn và đúng tâm trong dung sai không. Cpk ≥ 1,33 là yêu cầu phổ biến.",
    formula: "Cp = (USL − LSL) / 6σ\nCpk = min(USL − μ, μ − LSL) / 3σ\nσ = độ lệch chuẩn ngắn hạn (trong nhóm mẫu)",
    thresholds: [
      ["critical", "Cpk < 1,00", "Không đạt năng lực: chắc chắn có sản phẩm ngoài dung sai (> 2.700 ppm nếu đúng tâm)"],
      ["warning", "1,00 – 1,33", "Đạt tối thiểu, cần kiểm soát chặt / 100% kiểm tra"],
      ["good", "≥ 1,33", "Đạt (≈ 63 ppm ngoài dung sai nếu đúng tâm)"],
      ["good", "≥ 1,67", "Yêu cầu cho đặc tính quan trọng / quy trình mới (PPAP)"]
    ],
    body: `
### Ý nghĩa
- **Cp** chỉ so độ rộng dung sai với độ phân tán – *không quan tâm quy trình có đúng tâm hay không*.
- **Cpk** tính cả độ lệch tâm. Cp cao mà Cpk thấp → quy trình bị lệch, chỉ cần chỉnh tâm là cải thiện ngay.

### Ứng dụng trong SMT
- **SPI**: Cpk của thể tích / chiều cao kem hàn theo từng pad hoặc từng linh kiện (VD volume 70–130%).
- **Máy gắn**: Cmk / Cpk độ chính xác vị trí X, Y, góc θ.
- **Profile lò**: Cpk của peak, TAL nếu đo nhiều lần.

### Điều kiện để Cpk có nghĩa
1. Quy trình **ổn định thống kê** (control chart không có điểm bất thường).
2. Dữ liệu gần **phân bố chuẩn**.
3. Đủ mẫu: tối thiểu ~30, khuyến nghị ≥ 100 giá trị (VD 25 nhóm × 4–5 mẫu).

> [!IMPORTANT]
> Cpk tính trên 10 board vừa chạy xong không đại diện cho quy trình. Cpk dài hạn dùng **Ppk**.
`,
    tags: ["capability", "năng lực", "SPC", "SPI", "Cmk", "Ppk"],
    related: ["pp-ppk", "cmk", "control-chart", "spi-volume", "gage-rr"],
    references: ["AIAG SPC Manual", "AIAG PPAP"],
    calculator: "cpk"
  },
  {
    slug: "pp-ppk",
    symbol: "Ppk",
    vi: "Pp / Ppk – hiệu năng quy trình dài hạn",
    en: "Process performance Pp / Ppk",
    summary: "Giống Cp/Cpk nhưng dùng độ lệch chuẩn tổng (dài hạn). Thường yêu cầu Ppk ≥ 1,67 khi phê duyệt quy trình mới.",
    formula: "Ppk = min(USL − μ, μ − LSL) / 3s\ns = độ lệch chuẩn của toàn bộ dữ liệu",
    thresholds: [
      ["good", "≥ 1,67", "Yêu cầu PPAP cho nghiên cứu ban đầu (initial study)"],
      ["warning", "1,33 – 1,67", "Chấp nhận có điều kiện, theo yêu cầu khách"],
      ["critical", "< 1,33", "Cần cải tiến trước khi phê duyệt"]
    ],
    body: `
### Khác gì Cpk?
- **Cpk** dùng σ *trong nhóm mẫu* → phản ánh tiềm năng khi quy trình ổn định.
- **Ppk** dùng s *toàn bộ* → gồm cả dao động giữa ca, giữa lot, giữa ngày.

Nếu **Ppk ≪ Cpk**: quy trình có biến động giữa các nhóm (đổi lot kem, nhiệt độ phòng, đổi ca). Tìm nguyên nhân trong nhật ký 4M.
`,
    tags: ["capability", "PPAP", "long term"],
    related: ["cp-cpk", "control-chart"],
    references: ["AIAG PPAP 4th Ed."],
    calculator: "cpk"
  },
  {
    slug: "cmk",
    symbol: "Cmk",
    vi: "Cmk – năng lực máy",
    en: "Machine capability Cmk",
    summary: "Năng lực ngắn hạn của riêng máy (loại trừ ảnh hưởng người, vật tư). Dùng khi nghiệm thu máy gắn, máy in.",
    formula: "Cmk = min(USL − μ, μ − LSL) / 3σ (đo liên tục trên máy, điều kiện cố định)",
    thresholds: [
      ["good", "≥ 1,67", "Mức nghiệm thu phổ biến"],
      ["warning", "1,33 – 1,67", "Chấp nhận tuỳ yêu cầu"],
      ["critical", "< 1,33", "Không đạt nghiệm thu"]
    ],
    body: `
### Cách làm điển hình với máy gắn
1. Dùng board kính / board chuẩn và linh kiện thử (glass chip) của hãng.
2. Gắn liên tục ≥ 50 vị trí với cùng nozzle / head.
3. Đo lệch X, Y, θ bằng máy đo quang học hoặc chức năng tự đo của máy.
4. Tính Cmk cho từng trục với dung sai theo spec (VD ±40 µm).

### Khi nào cần đo lại
Sau sửa chữa lớn (thay head, camera, trục), sau di dời máy, theo chu kỳ PM năm.
`,
    tags: ["nghiệm thu", "placement accuracy", "máy gắn"],
    related: ["cp-cpk", "placement-accuracy"]
  },
  {
    slug: "gage-rr",
    symbol: "%GRR",
    vi: "Gage R&R – đánh giá hệ thống đo",
    en: "Gage Repeatability & Reproducibility",
    summary: "Kiểm tra sai số của thiết bị đo & người đo trước khi tin vào số liệu SPI, AOI, máy đo profile.",
    formula: "%GRR = σ(đo) / σ(tổng hoặc dung sai) × 100%\nndc = 1,41 × σ(sản phẩm) / σ(đo)",
    unit: "%",
    thresholds: [
      ["good", "< 10%", "Hệ thống đo chấp nhận được"],
      ["warning", "10 – 30%", "Chấp nhận có điều kiện (tuỳ tầm quan trọng, chi phí)"],
      ["critical", "> 30%", "Không chấp nhận – sửa hệ thống đo trước"],
      ["info", "ndc ≥ 5", "Số mức phân biệt tối thiểu"]
    ],
    body: `
### Ý nghĩa
- **Repeatability (EV)**: cùng người, cùng mẫu, đo lặp → sai khác do thiết bị.
- **Reproducibility (AV)**: khác người / khác cài đặt → sai khác do người.

### Ứng dụng
- **SPI**: chạy cùng 1 board 10–30 lần (đo động: load/unload lại) để kiểm tra lặp lại của volume / height.
- **AOI** (dữ liệu đạt/không đạt): dùng *Attribute Agreement Analysis* thay cho GRR biến liên tục.

> [!NOTE]
> Không làm GRR mà đã tính Cpk thì Cpk có thể đang đo… độ nhiễu của máy đo.
`,
    tags: ["MSA", "đo lường", "SPI"],
    related: ["cp-cpk", "spi-volume"],
    references: ["AIAG MSA 4th Ed."]
  },
  {
    slug: "control-chart",
    symbol: "SPC",
    vi: "Biểu đồ kiểm soát (Control chart)",
    en: "Control chart",
    summary: "Theo dõi quy trình theo thời gian để phát hiện bất thường trước khi ra sản phẩm lỗi.",
    formula: "UCL / LCL = trung bình ± 3σ (của thống kê đang theo dõi)\nX̄-R: UCL = X̄̄ + A₂R̄, LCL = X̄̄ − A₂R̄",
    body: `
### Chọn loại biểu đồ
| Dữ liệu | Biểu đồ |
|---|---|
| Biến liên tục, nhóm mẫu 2–9 (VD chiều cao kem 5 điểm/board) | X̄-R |
| Biến liên tục, từng giá trị (VD peak temp mỗi lần đo profile) | I-MR |
| Tỉ lệ lỗi (FPY theo ngày) | p-chart |
| Số lỗi trên đơn vị (lỗi/board) | u-chart |

### Dấu hiệu bất thường (quy tắc thường dùng)
1. 1 điểm ngoài ±3σ.
2. 2 trong 3 điểm liên tiếp ngoài ±2σ cùng phía.
3. 4 trong 5 điểm liên tiếp ngoài ±1σ cùng phía.
4. 7–9 điểm liên tiếp cùng một phía đường tâm (tuỳ bộ quy tắc).
5. 6 điểm liên tiếp cùng tăng hoặc cùng giảm (xu hướng).

> [!WARNING]
> Giới hạn kiểm soát (UCL/LCL) tính **từ dữ liệu**, không phải giới hạn dung sai (USL/LSL). Đừng vẽ dung sai lên rồi gọi là control chart.
`,
    tags: ["SPC", "X-bar R", "UCL", "LCL", "Western Electric"],
    related: ["cp-cpk", "pp-ppk"],
    references: ["AIAG SPC Manual 2nd Ed."]
  }
]);
