import { seedGroup } from "@/lib/handbook/seed/helper";

export const PROBLEM = seedGroup("problem", [
  {
    slug: "5-why",
    symbol: "5 Why",
    vi: "5 Why – hỏi vì sao đến gốc",
    en: "5 Whys",
    summary: "Hỏi “vì sao” liên tiếp cho tới khi gặp nguyên nhân hệ thống có thể xử lý. Làm cho cả nhánh xảy ra và nhánh lọt.",
    body: `
### Quy tắc
- Mỗi câu trả lời phải **có bằng chứng** (dữ liệu, ảnh, tái hiện), không đoán.
- Dừng khi gặp nguyên nhân thuộc **quy trình / hệ thống** (thiếu tiêu chuẩn, thiếu kiểm soát), không dừng ở “do người làm sai”.
- Làm **2 nhánh**: vì sao lỗi **xảy ra** và vì sao lỗi **lọt** (không bị phát hiện).

### Ví dụ ngắn
Chập thiếc → kem thừa → lỗ stencil mòn mép → stencil vượt 60.000 lần in → **không có giới hạn tuổi thọ stencil trong quy trình**.
`,
    tags: ["root cause", "RCA", "8D"],
    related: ["fishbone", "8d"]
  },
  {
    slug: "fishbone",
    symbol: "6M",
    vi: "Biểu đồ xương cá (Ishikawa 6M)",
    en: "Fishbone (Ishikawa) diagram",
    summary: "Liệt kê nguyên nhân có thể theo 6 nhóm để không bỏ sót trước khi đi sâu bằng 5 Why.",
    body: `
| Nhánh | Câu hỏi gợi ý cho SMT |
|---|---|
| **Man** – Con người | Đào tạo? Operator mới? Thao tác đúng WI? |
| **Machine** – Máy | Hiệu chuẩn? PM? Nozzle, feeder, dao gạt, stencil? |
| **Material** – Vật liệu | Lot kem, lot linh kiện, PCB, MSL, hạn dùng? |
| **Method** – Phương pháp | Chương trình máy, profile, thông số in, WI? |
| **Measurement** – Đo lường | Ngưỡng AOI/SPI, GRR, thiết bị đo profile? |
| **Environment** – Môi trường | Nhiệt độ, độ ẩm, ESD, bụi? |

> [!TIP]
> Khoanh tròn các nguyên nhân **có dữ liệu ủng hộ**, sau đó mới làm 5 Why cho chúng.
`,
    tags: ["Ishikawa", "6M", "RCA", "4M1E"],
    related: ["5-why", "8d", "4m-change"]
  },
  {
    slug: "8d",
    symbol: "8D",
    vi: "8D – giải quyết vấn đề 8 bước",
    en: "8 Disciplines problem solving",
    summary: "Quy trình chuẩn (AIAG / VDA) cho khiếu nại khách hàng và lỗi lặp lại: từ khoanh vùng đến phòng ngừa tái phát.",
    body: `
| Bước | Nội dung | Thời hạn thường gặp |
|---|---|---|
| D0 | Chuẩn bị, hành động khẩn cấp | Ngay |
| D1 | Lập nhóm đa chức năng | |
| D2 | Mô tả 5W2H | |
| D3 | Khoanh vùng tạm thời (sort, cách ly) | 24 giờ |
| D4 | Nguyên nhân gốc (xảy ra + lọt) | 7–10 ngày |
| D5 | Chọn giải pháp | |
| D6 | Triển khai & xác nhận hiệu quả | 30 ngày |
| D7 | Phòng ngừa tái phát, áp dụng ngang | |
| D8 | Ghi nhận nhóm, đóng | |

> [!TIP]
> Dùng mẫu **8D Problem Solving Report** trong bộ mẫu báo cáo SMT (có Fishbone + 5 Why sẵn).
`,
    tags: ["AIAG", "VDA", "khiếu nại", "corrective action"],
    related: ["5-why", "fishbone", "pfmea"],
    references: ["AIAG CQI-20 Effective Problem Solving", "VDA 8D"]
  },
  {
    slug: "pfmea",
    symbol: "PFMEA",
    vi: "PFMEA – phân tích rủi ro quy trình",
    en: "Process FMEA",
    summary: "Liệt kê cách mỗi bước quy trình có thể hỏng, đánh giá mức độ, xác suất, khả năng phát hiện để ưu tiên phòng ngừa.",
    formula: "AIAG 4th: RPN = S × O × D (1–1000)\nAIAG-VDA 2019: Action Priority (High / Medium / Low) theo bảng S-O-D",
    thresholds: [
      ["critical", "S = 9–10", "Ảnh hưởng an toàn / pháp lý – luôn ưu tiên, bất kể RPN"],
      ["info", "AP = High", "Bắt buộc có hành động hoặc giải trình"]
    ],
    body: `
### Ví dụ một dòng PFMEA SMT
| Bước | Kiểu hỏng | Ảnh hưởng | Nguyên nhân | Phòng ngừa | Phát hiện |
|---|---|---|---|---|---|
| In kem | Kem thừa ở QFN | Chập, hỏng chức năng | Stencil mòn | Giới hạn số lần in | SPI 100% + AOI |

### Cập nhật khi nào
Sau mỗi 8D (D7), khi có thay đổi 4M quan trọng, khi ra model mới. PFMEA “đóng băng” từ lúc phê duyệt là PFMEA chết.
`,
    tags: ["FMEA", "RPN", "AIAG-VDA", "rủi ro"],
    related: ["control-plan", "8d", "4m-change"],
    references: ["AIAG & VDA FMEA Handbook (2019)"]
  },
  {
    slug: "control-plan",
    symbol: "CP",
    vi: "Control Plan – kế hoạch kiểm soát",
    en: "Control plan",
    summary: "Bảng chốt: kiểm soát đặc tính nào, ở đâu, bằng phương pháp gì, tần suất bao nhiêu, xử lý thế nào khi bất thường.",
    body: `
### Các cột chính
Bước quy trình · Máy / thiết bị · Đặc tính sản phẩm / quy trình · Đặc tính đặc biệt (SC/CC) · Spec / dung sai · Phương pháp đo · Cỡ mẫu & tần suất · Phương pháp kiểm soát (SPC, checklist…) · **Kế hoạch phản ứng**.

### Ví dụ SMT
| Bước | Đặc tính | Spec | Đo | Tần suất | Phản ứng |
|---|---|---|---|---|---|
| Reflow | Profile peak / TAL | 235–250 °C / 45–90 s | Profiler | Đổi model + hằng tuần | Dừng lò, chỉnh, cách ly board từ lần đo trước |
| In kem | Volume kem | 70–130% | SPI | 100% | Dừng in, lau stencil, kiểm tra |
`,
    tags: ["IATF 16949", "PPAP", "reaction plan"],
    related: ["pfmea", "control-chart", "4m-change"],
    references: ["AIAG APQP & Control Plan"]
  },
  {
    slug: "4m-change",
    symbol: "4M1E",
    vi: "Quản lý thay đổi 4M1E",
    en: "4M1E change management",
    summary: "Mọi thay đổi Man / Machine / Material / Method / Environment phải được khai báo, đánh giá rủi ro và xác nhận.",
    body: `
### Ví dụ thay đổi phải khai báo
- **Man**: operator mới ở trạm quan trọng (printer, AOI, rework BGA).
- **Machine**: sửa chữa lớn, thay head / camera, đổi stencil, đổi jig.
- **Material**: lot kem mới, linh kiện thay thế (2nd source), nhà cung cấp PCB khác.
- **Method**: chương trình máy, profile lò, thông số in, ngưỡng AOI/SPI, WI.
- **Environment**: điều hoà hỏng, chuyển line, thay đổi bố trí.

### Xác nhận sau thay đổi
FAI, SPI Cpk, AOI 100% lô đầu, theo dõi FPY 3 ca. Rủi ro cao → QA duyệt trước khi chạy hàng loạt; khách yêu cầu thì gửi **PCN**.

> [!TIP]
> Dùng mẫu **4M1E Change Management Matrix** trong bộ mẫu báo cáo SMT.
`,
    tags: ["IATF 16949", "PCN", "change control", "4M"],
    related: ["fishbone", "fai", "pfmea", "aoi-false-call"],
    references: ["IATF 16949 §8.5.6"]
  }
]);
