import { seedGroup } from "@/lib/handbook/seed/helper";

export const INSPECTION = seedGroup("inspection", [
  {
    slug: "ipc-class",
    symbol: "Class 1/2/3",
    vi: "Cấp sản phẩm IPC (Class 1 / 2 / 3)",
    en: "IPC product classes",
    summary: "Mức yêu cầu chất lượng do khách hàng chọn. Cùng một mối hàn có thể đạt Class 2 nhưng không đạt Class 3.",
    thresholds: [
      ["info", "Class 1", "Điện tử thông dụng – chỉ cần hoạt động (đồ chơi, thiết bị rẻ)"],
      ["info", "Class 2", "Thiết bị chuyên dụng – cần hoạt động liên tục, tuổi thọ dài (máy tính, viễn thông, công nghiệp)"],
      ["info", "Class 3", "Hiệu năng cao / môi trường khắc nghiệt – không được hỏng (y tế, hàng không, ô tô an toàn)"]
    ],
    body: `
### Lưu ý
- Cấp IPC phải ghi trên bản vẽ / hợp đồng. Không ghi → mặc định thường là Class 2 (theo thoả thuận).
- IPC-A-610 phân 4 mức cho mỗi tiêu chí: **Target** (lý tưởng), **Acceptable**, **Process Indicator** (chấp nhận nhưng cần theo dõi quy trình), **Defect**.
- Process indicator xuất hiện nhiều → quy trình đang trôi, cần xử lý dù sản phẩm vẫn đạt.
`,
    tags: ["IPC-A-610", "J-STD-001", "class"],
    related: ["chip-solder-joint", "bga-voiding"],
    references: ["IPC-A-610", "IPC J-STD-001"]
  },
  {
    slug: "chip-solder-joint",
    symbol: "Chip joint",
    vi: "Tiêu chí mối hàn linh kiện chip (IPC-A-610)",
    en: "Chip component solder joint criteria",
    summary: "Các kích thước kiểm tra chính cho linh kiện chip 2 đầu (R, C 0201–1206): lệch cạnh, lệch đầu, độ rộng mối hàn.",
    thresholds: [
      ["warning", "Lệch cạnh (side overhang)", "Class 1, 2: ≤ 50% chiều rộng đầu điện cực (hoặc pad, lấy giá trị nhỏ hơn) · Class 3: ≤ 25%"],
      ["critical", "Lệch đầu (end overhang)", "Không cho phép – mọi Class"],
      ["warning", "Độ rộng mối hàn ở đầu (end joint width)", "Class 1, 2: ≥ 50% · Class 3: ≥ 75%"],
      ["critical", "Tombstone / billboard ngược mặt", "Khuyết tật (theo quy định từng trường hợp)"]
    ],
    body: `
### Đọc AOI theo IPC
Cài ngưỡng AOI theo **Class của sản phẩm**; đừng dùng chung một ngưỡng cho Class 2 và Class 3.

### Các lỗi chip thường gặp
| Lỗi | Nguyên nhân hay gặp |
|---|---|
| Tombstone | Pad không cân, lượng kem 2 đầu lệch, soak ngắn, N₂ |
| Shift (lệch) | Gắn lệch, kem lệch, board rung trên băng tải |
| Thiếu thiếc | Area ratio thấp, lỗ stencil tắc |
| Bi thiếc giữa chip (mid-chip ball) | Kem quá nhiều / tràn dưới thân – dùng aperture home-plate |

> [!NOTE]
> Giá trị trên tóm tắt từ IPC-A-610; luôn đối chiếu **bản tiêu chuẩn đang áp dụng** (Rev. G / H…) và spec riêng của khách.
`,
    tags: ["IPC-A-610", "side overhang", "tombstone", "AOI"],
    related: ["ipc-class", "aoi-false-call", "placement-accuracy"],
    references: ["IPC-A-610"]
  },
  {
    slug: "bga-voiding",
    symbol: "Void %",
    vi: "Void (rỗ khí) trong mối hàn BGA",
    en: "BGA voiding",
    summary: "Phần trăm diện tích rỗ khí trong ảnh X-ray của mỗi bi. Void lớn làm giảm độ bền nhiệt & cơ.",
    formula: "Void % = Tổng diện tích void / Diện tích bi (ảnh X-ray) × 100%",
    unit: "%",
    thresholds: [
      ["good", "≤ 25% mỗi bi", "Ngưỡng phổ biến (IPC-7095 / spec khách)"],
      ["critical", "> 25% hoặc void tại mặt tiếp xúc pad", "Không đạt – phân tích profile, pad via"]
    ],
    body: `
### Nguyên nhân
- Via-in-pad không lấp đầy, khí từ PCB.
- Soak / profile không đủ cho khí thoát; flux nhiều chất bay hơi.
- Pad thermal QFN lớn in kem 100% diện tích.

### Giảm void
Chia aperture (window pane) cho pad lớn, tối ưu soak, dùng kem low-void, N₂, hoặc reflow chân không.

> [!NOTE]
> Kiểm tra bản IPC-A-610 và spec khách đang áp dụng để chốt ngưỡng; một số khách yêu cầu chặt hơn (VD ≤ 20%, hoặc riêng cho thermal pad).
`,
    tags: ["X-ray", "AXI", "BGA", "QFN", "IPC-7095"],
    related: ["soak", "area-ratio", "pcb-warpage"],
    references: ["IPC-7095 BGA Design & Assembly", "IPC-A-610"]
  },
  {
    slug: "aoi-false-call",
    symbol: "False call",
    vi: "AOI: báo giả (False call) & lọt lỗi (Escape)",
    en: "AOI false call & escape rate",
    summary: "Cân bằng giữa báo giả (tốn công xác nhận) và lọt lỗi (đến tay khách). Lọt lỗi luôn đắt hơn.",
    formula: "False call rate = Số điểm báo lỗi giả / Số điểm (hoặc board) kiểm tra\nEscape rate = Lỗi lọt qua AOI (phát hiện sau) / Tổng lỗi thật",
    body: `
### Tối ưu chương trình AOI
1. Gom dữ liệu báo giả theo **linh kiện / thuật toán**, sửa các vị trí chiếm nhiều nhất trước (Pareto).
2. Mọi thay đổi ngưỡng phải **xác nhận lại bằng mẫu lỗi thật** (golden defect board) – nới ngưỡng để giảm báo giả là nguyên nhân lọt lỗi kinh điển.
3. Thay đổi chương trình AOI quản lý như **thay đổi 4M (Method)**.

### Chỉ số cần theo dõi
- False call / board (mục tiêu tuỳ nhà máy).
- Escape: lỗi phát hiện ở ICT/FCT/khách mà AOI có khả năng thấy.
- Operator override: tỉ lệ operator bấm “OK” – quá cao là dấu hiệu bỏ qua cảnh báo.
`,
    tags: ["AOI", "false call", "escape", "chương trình kiểm tra"],
    related: ["fpy", "chip-solder-joint", "4m-change"]
  },
  {
    slug: "fai",
    symbol: "FAI",
    vi: "Kiểm tra mẫu đầu (First Article Inspection)",
    en: "First Article Inspection",
    summary: "Kiểm tra board đầu tiên sau mỗi lần đổi model / đổi chương trình / thay đổi 4M trước khi chạy hàng loạt.",
    body: `
### Nội dung kiểm tra
1. **Đúng linh kiện**: đo giá trị R, C, L bằng LCR / máy FAI so với BOM; kiểm tra mã IC.
2. **Đúng cực tính & hướng**: diode, tụ hoá, IC, LED.
3. **Không thiếu / thừa** linh kiện so với danh sách vị trí.
4. Ngoại quan mối hàn sau reflow theo IPC-A-610.
5. Lưu hồ sơ FAI (ảnh, kết quả đo, người duyệt).

### Khi nào bắt buộc
Đổi model · đổi phiên bản BOM / chương trình · thay linh kiện thay thế (2nd source) · sau sửa máy lớn · đầu ca nếu khách yêu cầu.
`,
    tags: ["first article", "LCR", "đổi model", "BOM"],
    related: ["material-verification", "changeover-smed", "4m-change"]
  }
]);
