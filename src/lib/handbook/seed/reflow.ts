import { seedGroup } from "@/lib/handbook/seed/helper";

const PROFILE_TABLE = `
| Vùng | SAC305 (không chì) – điển hình | Sn63/Pb37 – điển hình |
|---|---|---|
| Ramp-up | 1 – 3 °C/s | 1 – 3 °C/s |
| Soak / Preheat | 150 – 200 °C, 60 – 120 s | 120 – 160 °C, 60 – 120 s |
| TAL (trên điểm lỏng) | > 217 °C, 45 – 90 s | > 183 °C, 45 – 90 s |
| Peak | 235 – 250 °C | 205 – 225 °C |
| Cooling | 2 – 4 °C/s (tối đa 6 °C/s) | 2 – 4 °C/s |
`;

export const REFLOW = seedGroup("reflow", [
  {
    slug: "reflow-profile",
    symbol: "Profile",
    vi: "Profile nhiệt lò Reflow – tổng quan",
    en: "Reflow profile overview",
    summary: "Đường nhiệt độ theo thời gian mà board trải qua. Phải thoả cả datasheet kem hàn và giới hạn linh kiện.",
    thresholds: [
      ["info", "Ưu tiên: datasheet kem hàn", "Khung profile của nhà sản xuất kem"],
      ["critical", "Không vượt Tp của linh kiện", "J-STD-020 (245 / 250 / 260 °C tuỳ kích thước thân)"]
    ],
    body: `
### Các vùng của profile
${PROFILE_TABLE}

> [!NOTE]
> Bảng trên là giá trị điển hình để tham khảo. Luôn dùng khung trong **datasheet kem hàn** đang dùng và kiểm tra **nhiệt độ chịu đựng của linh kiện nhạy cảm nhất** (connector nhựa, LED, tụ điện phân, module).

### Đo profile đúng cách
- Gắn ≥ 3–5 thermocouple: linh kiện **lớn nhất** (BGA giữa thân, connector), linh kiện **nhỏ nhất** ở mép board, vùng đồng lớn.
- Dùng keo nhiệt độ cao / hàn nhiệt độ cao, đầu TC chạm mối hàn.
- Đo khi đổi model, đổi lò / tốc độ băng tải, và định kỳ (VD hằng tuần) để phát hiện lò trôi.

### Profile kiểu Ramp-to-Spike vs Soak
- **Ramp-to-spike (RTS)**: tăng đều tới peak – ít void, ít tiêu hao flux, hợp board đơn giản.
- **Soak (saddle)**: có đoạn bằng để cân bằng nhiệt – hợp board nhiều khối lượng nhiệt khác nhau (ΔT lớn).
`,
    tags: ["reflow", "SAC305", "thermocouple", "J-STD-020", "profile"],
    related: ["ramp-rate", "soak", "tal", "peak-temperature", "cooling-rate", "delta-t"],
    references: ["Datasheet kem hàn", "IPC/JEDEC J-STD-020", "IPC-7530 Reflow profiling"]
  },
  {
    slug: "ramp-rate",
    symbol: "°C/s",
    vi: "Tốc độ gia nhiệt (Ramp-up rate)",
    en: "Ramp-up rate",
    summary: "Tốc độ tăng nhiệt từ nhiệt độ phòng tới vùng soak. Quá nhanh gây sốc nhiệt và bắn kem.",
    unit: "°C/s",
    thresholds: [
      ["good", "1 – 3 °C/s", "Dải phổ biến"],
      ["critical", "> 3 °C/s", "Vượt khuyến nghị J-STD-020; nguy cơ nứt tụ gốm, bi thiếc"]
    ],
    body: `
### Hậu quả khi sai
- **Quá nhanh**: dung môi trong flux bay hơi mạnh → bắn kem, **bi thiếc**; sốc nhiệt làm **nứt tụ MLCC**; kem chảy sệ (slump) → chập.
- **Quá chậm**: tốn chiều dài lò, flux bị tiêu hao sớm.

Đo ramp rate theo đoạn trượt (VD trung bình trên 10–20 s), không lấy đỉnh nhọn tức thời của 1 điểm đo.
`,
    tags: ["reflow", "preheat", "bi thiếc", "MLCC crack"],
    related: ["reflow-profile", "soak"]
  },
  {
    slug: "soak",
    symbol: "Soak",
    vi: "Vùng Soak / Preheat",
    en: "Soak / preheat zone",
    summary: "Đoạn giữ nhiệt để flux hoạt hoá và cân bằng nhiệt giữa linh kiện lớn và nhỏ trước khi chảy thiếc.",
    unit: "°C · s",
    thresholds: [
      ["good", "150 – 200 °C trong 60 – 120 s (SAC305)", "Theo datasheet kem"],
      ["warning", "> 120 s", "Flux cạn → kém thấm ướt, “graping”, void"],
      ["warning", "< 60 s", "ΔT lớn lúc chảy → tombstone, hàn không đều"]
    ],
    body: `
### Mục đích
1. Bay hơi dung môi còn lại.
2. Hoạt hoá flux, khử oxit trên pad và chân linh kiện.
3. Giảm chênh lệch nhiệt (ΔT) để mọi mối hàn chảy gần như cùng lúc.

### Lỗi liên quan
- **Tombstone** (bia mộ): hai đầu chip chảy không đồng thời – soak ngắn / ΔT lớn / pad không cân.
- **Graping** (thiếc vón như chùm nho): flux cạn do soak quá dài, hạt kem mịn bị oxy hoá.
- **Void BGA / QFN**: soak quá ngắn không kịp thoát khí; quá dài làm flux cạn.
`,
    tags: ["reflow", "preheat", "tombstone", "void"],
    related: ["reflow-profile", "tal", "delta-t", "bga-voiding"]
  },
  {
    slug: "tal",
    symbol: "TAL",
    vi: "TAL – thời gian trên nhiệt độ lỏng",
    en: "Time Above Liquidus",
    summary: "Thời gian mối hàn ở trạng thái lỏng (SAC305: trên ~217 °C). Quyết định thấm ướt và lớp liên kim (IMC).",
    unit: "giây",
    thresholds: [
      ["good", "45 – 90 s", "Dải điển hình theo datasheet kem"],
      ["warning", "< 45 s", "Thấm ướt kém, mối hàn nguội, head-in-pillow"],
      ["warning", "> 90 s", "IMC dày giòn, hại linh kiện, tăng void / bạc màu"]
    ],
    body: `
### Ý nghĩa
Trong TAL, thiếc lỏng thấm ướt pad & chân linh kiện và tạo lớp **IMC (Cu₆Sn₅)** – lớp này cần đủ dày để bám tốt nhưng quá dày thì giòn.

### Kiểm tra
- Đo TAL tại cả linh kiện **lớn nhất** (TAL ngắn nhất) và **nhỏ nhất** (TAL dài nhất) – cả hai phải nằm trong dải.
- Điểm lỏng: SAC305 ≈ 217–220 °C; Sn63/Pb37 = 183 °C.
`,
    tags: ["reflow", "liquidus", "IMC", "thấm ướt"],
    related: ["reflow-profile", "peak-temperature", "delta-t"]
  },
  {
    slug: "peak-temperature",
    symbol: "Tp",
    vi: "Nhiệt độ đỉnh (Peak temperature)",
    en: "Peak temperature",
    summary: "Nhiệt độ cao nhất tại mối hàn. Phải đủ cao để thấm ướt tốt nhưng không vượt giới hạn linh kiện.",
    unit: "°C",
    thresholds: [
      ["good", "235 – 250 °C (SAC305)", "Thường ≥ điểm lỏng + ~15–20 °C"],
      ["critical", "> Tp linh kiện (J-STD-020)", "Phồng rộp, nứt (popcorn), hỏng LED / connector"]
    ],
    body: `
### Giới hạn linh kiện (J-STD-020, không chì)
Nhiệt độ phân loại Tp phụ thuộc **độ dày thân** và **thể tích** linh kiện: **260 °C** cho linh kiện nhỏ/mỏng, **250 °C** hoặc **245 °C** cho linh kiện dày/lớn. Linh kiện lớn (nóng chậm) lại có giới hạn thấp hơn, cần chú ý khi board có cả BGA lớn và chip nhỏ.

### Thời gian gần đỉnh
Hạn chế thời gian trong khoảng Tp − 5 °C (J-STD-020: tối đa ~30 s cho phân loại linh kiện).
`,
    tags: ["reflow", "J-STD-020", "popcorn"],
    related: ["reflow-profile", "tal", "msl", "delta-t"],
    references: ["IPC/JEDEC J-STD-020"]
  },
  {
    slug: "cooling-rate",
    symbol: "Cool",
    vi: "Tốc độ làm nguội",
    en: "Cooling rate",
    summary: "Nguội nhanh vừa phải cho mối hàn hạt mịn, bóng; quá nhanh gây ứng suất nứt linh kiện.",
    unit: "°C/s",
    thresholds: [
      ["good", "2 – 4 °C/s", "Mối hàn hạt mịn, bền"],
      ["critical", "> 6 °C/s", "Vượt giới hạn J-STD-020 – nứt tụ gốm, cong board"],
      ["warning", "< 1 °C/s", "Hạt thô, IMC dày, mối hàn xỉn"]
    ],
    body: `
Đo từ peak xuống ~150–180 °C. Board dày, nhiều lớp đồng khó nguội nhanh – kiểm tra hiệu quả quạt / nước làm mát của lò.
`,
    tags: ["reflow", "cooling", "MLCC"],
    related: ["reflow-profile", "peak-temperature"]
  },
  {
    slug: "delta-t",
    symbol: "ΔT",
    vi: "ΔT – chênh lệch nhiệt trên board",
    en: "ΔT across the board",
    summary: "Chênh lệch nhiệt độ giữa điểm nóng nhất và lạnh nhất trên board tại peak. ΔT nhỏ thì dễ có profile đạt cho mọi linh kiện.",
    formula: "ΔT = T(max) − T(min) giữa các thermocouple tại thời điểm peak",
    unit: "°C",
    thresholds: [
      ["good", "≤ 10 °C", "Dễ đạt cửa sổ profile"],
      ["warning", "10 – 15 °C", "Cần soak tốt hơn / chỉnh vùng"],
      ["critical", "> 15 °C", "Khó cùng lúc đạt TAL cho linh kiện lớn và không quá nhiệt linh kiện nhỏ"]
    ],
    body: `
### Giảm ΔT
- Thêm / kéo dài soak, giảm tốc độ băng tải.
- Đặt board theo hướng để linh kiện lớn nhận nhiệt sớm.
- Dùng lò nhiều vùng hơn, kiểm tra quạt đối lưu từng vùng.
- Với panel lớn: kiểm tra hiệu ứng mép (biên board nóng nhanh hơn giữa).
`,
    tags: ["reflow", "thermocouple", "cân bằng nhiệt"],
    related: ["reflow-profile", "soak", "tal"]
  },
  {
    slug: "nitrogen-reflow",
    symbol: "O₂ ppm",
    vi: "Reflow khí Nitơ (N₂) – nồng độ O₂",
    en: "Nitrogen reflow – residual O₂",
    summary: "Giảm oxy trong lò giúp thấm ướt tốt hơn, mối hàn sáng, giảm void; đổi lại tốn chi phí khí.",
    unit: "ppm O₂",
    thresholds: [
      ["info", "500 – 1.000 ppm", "Mức thường dùng"],
      ["info", "< 100 ppm", "Ứng dụng đặc biệt (BGA pitch nhỏ, kem hạt mịn)"]
    ],
    body: `
### Lợi ích
Thấm ướt tốt hơn cho bề mặt OSP, kem hạt mịn (Type 5); giảm graping, void, bi thiếc; mối hàn bóng đẹp.

### Mặt trái
- Chi phí nitơ đáng kể.
- Thấm ướt nhanh hơn có thể **làm tăng tombstone** với chip nhỏ nếu pad / soak chưa tối ưu.
`,
    tags: ["N2", "nitrogen", "oxy"],
    related: ["reflow-profile", "soak"]
  }
]);
