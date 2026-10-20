import { seedGroup } from "@/lib/handbook/seed/helper";

export const PRINTING = seedGroup("printing", [
  {
    slug: "area-ratio",
    symbol: "AR",
    vi: "Area ratio & Aspect ratio của stencil",
    en: "Stencil area ratio & aspect ratio",
    summary: "Quyết định kem có “nhả” khỏi lỗ stencil hay không. Area ratio ≥ 0,66 theo IPC-7525.",
    formula: "Area ratio = Diện tích lỗ / Diện tích thành lỗ = (L × W) / (2 × (L + W) × T)\nLỗ tròn: AR = D / (4 × T)\nAspect ratio = W / T",
    thresholds: [
      ["good", "AR ≥ 0,66 · Aspect ≥ 1,5", "Nhả kem tốt (IPC-7525)"],
      ["warning", "AR 0,5 – 0,66", "Cần stencil cắt laser điện đánh bóng / nano-coating, theo dõi SPI chặt"],
      ["critical", "AR < 0,5", "Rủi ro thiếu kem cao – giảm độ dày stencil hoặc dùng step stencil"]
    ],
    body: `
### Ý nghĩa
Khi tách stencil, kem bị “giằng co” giữa **pad** (kéo kem xuống) và **thành lỗ** (giữ kem lại). Diện tích pad phải đủ lớn so với diện tích thành lỗ.

### Ví dụ
Pad 0,25 × 0,25 mm (QFN pitch 0,5), stencil 0,12 mm:
AR = 0,0625 / (2 × 0,5 × 0,12) = **0,52** → dưới 0,66. Giải pháp: stencil 0,10 mm (AR = 0,625) hoặc step-down cục bộ.

### Mẹo thiết kế aperture
- Giảm 5–10% diện tích so với pad cho linh kiện fine pitch để tránh chập thiếc.
- Pad lớn (QFN thermal pad): chia lưới (window pane), tổng 50–80% diện tích để tránh void & nổi linh kiện.
- Chip nhỏ chống tombstone: aperture dạng home-plate / U-shape.
`,
    tags: ["IPC-7525", "stencil", "aperture", "nhả kem"],
    related: ["stencil-thickness", "spi-volume", "paste-type"],
    references: ["IPC-7525 Stencil Design Guidelines"],
    calculator: "area-ratio"
  },
  {
    slug: "stencil-thickness",
    symbol: "T",
    vi: "Độ dày & lực căng stencil",
    en: "Stencil thickness & tension",
    summary: "Độ dày quyết định lượng kem; lực căng quyết định độ khít với PCB. Kiểm tra lực căng định kỳ.",
    unit: "mm · N/cm",
    thresholds: [
      ["info", "0,10 – 0,15 mm", "Dải độ dày phổ biến (0,12 mm rất thông dụng)"],
      ["info", "0,08 – 0,10 mm", "Fine pitch 0,4 mm, 0201/01005"],
      ["good", "Lực căng ≥ ~35 N/cm", "Mức phổ biến – theo spec nhà cung cấp khung"],
      ["critical", "Lực căng giảm rõ / lưới chùng", "Kem lem, lệch in – thay / căng lại"]
    ],
    body: `
### Chọn độ dày
Chọn theo linh kiện **nhỏ nhất / pitch nhỏ nhất** trên board (để giữ area ratio), rồi bù kem cho linh kiện lớn bằng:
- Mở rộng aperture (overprint) cho connector, linh kiện THT in-paste.
- **Step stencil**: dày hơn ở vùng cần nhiều kem, mỏng hơn ở vùng fine pitch.

### Quản lý stencil
- Đo lực căng tại 5 điểm khi nhận và theo chu kỳ (VD hàng tháng).
- Ghi **số lần in** – mép lỗ mòn theo số lần in, gây kem tràn / chập.
- Kiểm tra lỗ bị tắc, mép xước sau mỗi lần vệ sinh.
`,
    tags: ["stencil", "tension", "step stencil"],
    related: ["area-ratio", "spi-volume", "stencil-cleaning"]
  },
  {
    slug: "spi-volume",
    symbol: "SPI",
    vi: "SPI – thể tích, chiều cao, diện tích, lệch",
    en: "SPI volume / height / area / offset",
    summary: "60–70% lỗi SMT bắt nguồn từ khâu in kem. SPI đo từng pad để chặn lỗi ngay sau printer.",
    formula: "Volume % = Thể tích đo / (Diện tích aperture × Độ dày stencil) × 100%",
    unit: "%",
    thresholds: [
      ["good", "Volume 70 – 130%", "Dải spec phổ biến (nhiều nơi dùng 50–150% cho pad lớn)"],
      ["warning", "Cpk volume 1,0 – 1,33", "Quy trình in chưa ổn định"],
      ["critical", "< 50% hoặc > 150%", "Nguy cơ hở / chập – dừng kiểm tra printer"]
    ],
    body: `
### Các chỉ số SPI
| Chỉ số | Lỗi thường gặp nếu sai |
|---|---|
| Volume thấp | Hở mối hàn, thiếu thiếc, head-in-pillow (BGA) |
| Volume cao | Chập thiếc, bi thiếc |
| Height cao / thấp | Lỗ tắc, stencil không khít |
| Area | Kem lem, tràn |
| Offset X/Y | Lệch alignment, stencil giãn |
| Bridge | Kem chạm nhau giữa 2 pad |

### Dùng SPI hiệu quả
- Đặt ngưỡng theo **từng loại linh kiện**, không 1 ngưỡng cho cả board.
- Theo dõi **xu hướng** (control chart) của volume để biết lúc cần lau stencil, trước khi ra lỗi.
- Bật **closed-loop** (SPI gửi bù offset về printer) nếu có.
`,
    tags: ["solder paste inspection", "kem hàn", "Cpk"],
    related: ["area-ratio", "squeegee", "stencil-cleaning", "cp-cpk"]
  },
  {
    slug: "squeegee",
    symbol: "Print",
    vi: "Thông số in: áp lực, tốc độ gạt, tách stencil",
    en: "Print parameters",
    summary: "Áp lực vừa đủ để gạt sạch mặt stencil; tốc độ & tốc độ tách quyết định độ điền đầy và nhả kem.",
    thresholds: [
      ["info", "Áp lực ~0,18 – 0,27 kg / cm dao", "Điểm khởi đầu: tăng dần đến khi mặt stencil sạch kem"],
      ["info", "Tốc độ gạt 20 – 80 mm/s", "Fine pitch chậm hơn để kem điền đầy lỗ"],
      ["info", "Tốc độ tách 0,5 – 3 mm/s", "Chậm giúp nhả kem tốt ở lỗ nhỏ"],
      ["info", "Print gap = 0 (on-contact)", "Stencil phải áp sát PCB"]
    ],
    body: `
### Ảnh hưởng của từng thông số
- **Áp lực quá thấp** → còn kem trên mặt stencil, in dày, chập.
- **Áp lực quá cao** → “đào” kem khỏi lỗ lớn (scooping), mòn dao & stencil.
- **Tốc độ quá nhanh** → kem không kịp lăn & điền đầy → thiếu kem.
- **Tách quá nhanh** → kem bị kéo theo stencil (đuôi, rách kem).

### Kiểm tra
- Cuộn kem (paste roll) nên có đường kính ~10–15 mm, lăn đều suốt chiều dài dao.
- Support pin / jig đỡ phải phẳng – PCB võng làm in không đều.

> [!NOTE]
> Giá trị trên chỉ là điểm khởi đầu. Luôn chốt bằng thử nghiệm + SPI (DOE nhỏ: áp lực × tốc độ).
`,
    tags: ["printer", "squeegee", "dao gạt", "separation"],
    related: ["spi-volume", "stencil-cleaning", "solder-paste-handling"]
  },
  {
    slug: "stencil-cleaning",
    symbol: "USC",
    vi: "Lau mặt dưới stencil (Under-stencil cleaning)",
    en: "Under-stencil cleaning",
    summary: "Kem dính mặt dưới stencil gây lem, bi thiếc, chập. Tần suất lau phụ thuộc pitch nhỏ nhất.",
    thresholds: [
      ["info", "Fine pitch ≤ 0,5 mm: 1–5 lần in / lần lau", ""],
      ["info", "Board thông thường: 5–10 lần in / lần lau", "Tối ưu bằng xu hướng SPI"]
    ],
    body: `
### Chế độ lau
- **Wet** (dung môi) → **Vacuum** (hút lỗ) → **Dry** (lau khô). Chế độ đầy đủ W-V-D cho fine pitch.
- Dùng quá nhiều dung môi có thể làm loãng kem ở lần in sau.

### Tối ưu tần suất
Vẽ volume SPI theo số lần in sau mỗi lần lau. Lau ngay *trước* khi volume bắt đầu giảm/tăng rõ.
`,
    tags: ["printer", "vệ sinh", "bi thiếc"],
    related: ["spi-volume", "squeegee"]
  },
  {
    slug: "solder-paste-handling",
    symbol: "Paste",
    vi: "Bảo quản & sử dụng kem hàn",
    en: "Solder paste handling",
    summary: "Kem hàn là vật tư “sống”: nhiệt độ bảo quản, rã đông, thời gian trên stencil đều ảnh hưởng chất lượng in.",
    thresholds: [
      ["info", "Bảo quản 0 – 10 °C", "Theo datasheet (thường 2–10 °C), không để đông đá"],
      ["info", "Rã đông ≥ 4 giờ ở nhiệt độ phòng", "Để nguyên nắp, không gia nhiệt"],
      ["info", "Thời gian trên stencil ~8 – 12 giờ", "Theo datasheet; hết hạn thì bỏ"],
      ["critical", "Mở nắp khi còn lạnh", "Hơi nước ngưng tụ → bi thiếc, bắn thiếc"]
    ],
    body: `
### Quy trình chuẩn
1. Nhập kho: ghi ngày nhận, hạn dùng, nhiệt độ tủ. **FIFO**.
2. Lấy ra rã đông: dán nhãn giờ lấy ra, giờ được dùng.
3. Khuấy 1–3 phút (tay hoặc máy theo datasheet) trước khi dùng.
4. Ghi giờ bắt đầu dùng trên stencil; bổ sung kem ít mà thường xuyên.
5. Không trộn kem cũ đã dùng trên stencil với kem mới trong hũ.

### Dấu hiệu kem có vấn đề
Kem khô, không lăn thành cuộn, độ nhớt thay đổi, SPI height dao động mạnh, bi thiếc tăng.
`,
    tags: ["kem hàn", "SAC305", "bảo quản", "FIFO"],
    related: ["paste-type", "squeegee", "room-environment"],
    references: ["Datasheet nhà sản xuất kem hàn", "IPC-7527"]
  },
  {
    slug: "paste-type",
    symbol: "Type 4",
    vi: "Cỡ hạt kem hàn (Type 3/4/5) & quy tắc 5 hạt",
    en: "Solder powder type & 5-ball rule",
    summary: "Hạt càng mịn in được lỗ càng nhỏ nhưng dễ oxy hoá hơn. Chọn theo aperture nhỏ nhất.",
    thresholds: [
      ["info", "Type 3: 25 – 45 µm", "Pitch ≥ 0,5 mm, chip ≥ 0402"],
      ["info", "Type 4: 20 – 38 µm", "Phổ biến nhất hiện nay, pitch 0,4–0,5 mm, 0201"],
      ["info", "Type 5: 15 – 25 µm", "01005, pitch 0,3–0,4 mm, µBGA"],
      ["info", "Type 6: 5 – 15 µm", "Siêu mịn, SiP / module"]
    ],
    body: `
### Quy tắc 5 hạt (5-ball rule)
Cạnh hẹp nhất của aperture phải chứa được **ít nhất ~5 hạt** lớn nhất xếp ngang. Ví dụ aperture rộng 0,2 mm = 200 µm, Type 3 (45 µm) chỉ được ~4,4 hạt → nên dùng Type 4.

### Các thông số khác của kem
- **Hợp kim**: SAC305 (Sn96.5/Ag3.0/Cu0.5, nóng chảy ~217–220 °C) phổ biến cho không chì; Sn63/Pb37 nóng chảy 183 °C.
- **Hàm lượng kim loại**: ~88–90% khối lượng cho in stencil.
- **Loại flux**: thường ROL0 no-clean (xem mục Flux).
`,
    tags: ["kem hàn", "SAC305", "J-STD-005", "powder"],
    related: ["area-ratio", "solder-paste-handling", "flux-classification"],
    references: ["IPC J-STD-005", "IPC J-STD-006"]
  }
]);
