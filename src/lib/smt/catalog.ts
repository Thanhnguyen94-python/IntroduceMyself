import type { LocalizedText } from "@/lib/content/types";
import type { ReportSlug } from "@/lib/smt/types";

// 5 mẫu báo cáo chia sẻ trên trang Tài liệu (/tai-lieu-ky-thuat/smt-reports/<slug>).
export type ReportTemplate = {
  slug: ReportSlug;
  icon: string;
  code: string;
  standard: string;
  title: LocalizedText;
  summary: LocalizedText;
  sections: { vi: string[]; en: string[] };
  formulas: string[];
  // Dữ liệu cần nhập (tên bộ dữ liệu trong Admin)
  inputs: string[];
};

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    slug: "8d",
    icon: "🧭",
    code: "SMT-RPT-01",
    standard: "AIAG 8D · VDA",
    title: { vi: "Báo cáo 8D giải quyết vấn đề", en: "8D Problem Solving Report" },
    summary: {
      vi: "Quy trình D0 → D8 cho khiếu nại khách hàng / lỗi lặp lại: 5W2H, khoanh vùng, Fishbone 6M, 5 Why cho cả nhánh xảy ra & nhánh lọt, xác nhận hiệu quả.",
      en: "D0 → D8 workflow for customer complaints and recurring defects: 5W2H, containment, 6M fishbone, 5 Whys for occurrence & escape, effectiveness check."
    },
    sections: {
      vi: ["D0 Chuẩn bị & ERA", "D1 Lập nhóm", "D2 Mô tả 5W2H", "D3 Khoanh vùng tạm thời", "D4 Fishbone + 5 Why", "D5 Chọn giải pháp", "D6 Triển khai & xác nhận", "D7 Phòng ngừa tái phát", "D8 Ghi nhận & đóng"],
      en: ["D0 Prepare & ERA", "D1 Team", "D2 5W2H description", "D3 Interim containment", "D4 Fishbone + 5 Whys", "D5 Permanent actions", "D6 Implement & verify", "D7 Prevent recurrence", "D8 Recognize & close"]
    },
    formulas: ["Root cause phải tái hiện được (bật / tắt lỗi)", "Hiệu quả = PPM trước vs PPM sau, thời gian theo dõi ≥ 3 lô"],
    inputs: ["Báo cáo 8D"]
  },
  {
    slug: "4m1e",
    icon: "🔁",
    code: "SMT-RPT-02",
    standard: "IATF 16949 §8.5.6",
    title: { vi: "Ma trận quản lý thay đổi 4M1E", en: "4M1E Change Management Matrix" },
    summary: {
      vi: "Theo dõi mọi thay đổi Man / Machine / Material / Method / Environment: đánh giá rủi ro, kế hoạch xác nhận (FAI, SPI Cpk, AOI 100%), trạng thái phê duyệt.",
      en: "Track every Man / Machine / Material / Method / Environment change: risk rating, validation plan (FAI, SPI Cpk, 100% AOI), approval status."
    },
    sections: { vi: ["Ma trận hạng mục × trạng thái", "Danh sách thay đổi & rủi ro", "Kế hoạch / kết quả xác nhận"], en: ["Category × status matrix", "Change list & risk", "Validation plan / result"] },
    formulas: ["Rủi ro cao → bắt buộc FAI + QA duyệt trước khi chạy hàng loạt"],
    inputs: ["Thay đổi 4M1E"]
  },
  {
    slug: "oee-line-balance",
    icon: "⚙️",
    code: "SMT-RPT-03",
    standard: "OEE (Nakajima) · Lean",
    title: { vi: "OEE & Cân bằng chuyền / Bottleneck", en: "OEE & Line Balance / Bottleneck" },
    summary: {
      vi: "OEE = Availability × Performance × Quality theo ngày / line / ca, phân rã tổn thất thời gian, lý do dừng máy và cân bằng cycle time từng trạm so với takt.",
      en: "OEE = Availability × Performance × Quality by day / line / shift, time-loss breakdown, downtime reasons and station cycle-time balance vs takt."
    },
    sections: { vi: ["KPI OEE vs mục tiêu", "Xu hướng OEE theo ngày", "Thác tổn thất thời gian", "Lý do dừng máy", "Line balance & bottleneck"], en: ["OEE KPIs vs target", "Daily OEE trend", "Time-loss waterfall", "Downtime reasons", "Line balance & bottleneck"] },
    formulas: ["A = (Kế hoạch − Dừng) / Kế hoạch", "P = CT chuẩn × Sản lượng / Thời gian chạy", "Q = Đạt lần đầu / Sản lượng", "Line balance = Σ CT / (n × CT max)"],
    inputs: ["Nhật ký sản xuất", "Cycle time trạm"]
  },
  {
    slug: "yield-pareto",
    icon: "📉",
    code: "SMT-RPT-04",
    standard: "IPC-A-610 · IPC-9261",
    title: { vi: "Yield chất lượng & Pareto lỗi", en: "Quality Yield & Defect Pareto" },
    summary: {
      vi: "FPY, DPMO, PPM theo ngày và model; Pareto lỗi 80/20, phân bổ theo công đoạn (in kem, gắn, reflow) và trạm phát hiện, top vị trí lỗi (RefDes).",
      en: "FPY, DPMO, PPM by day and model; 80/20 defect Pareto, split by process (print, placement, reflow) and detection point, top defect locations (RefDes)."
    },
    sections: { vi: ["KPI FPY / DPMO / PPM", "Pareto lỗi", "Theo công đoạn & trạm phát hiện", "Top vị trí lỗi", "FPY theo model"], en: ["FPY / DPMO / PPM KPIs", "Defect Pareto", "By process & detection", "Top defect locations", "FPY by model"] },
    formulas: ["FPY = Đạt lần đầu / Tổng board", "DPMO = Điểm lỗi / (Board × Cơ hội lỗi) × 10⁶", "PPM = Board lỗi / Tổng board × 10⁶"],
    inputs: ["Nhật ký sản xuất", "Nhật ký lỗi"]
  },
  {
    slug: "feeder-nozzle",
    icon: "🧰",
    code: "SMT-RPT-05",
    standard: "TPM · Preventive Maintenance",
    title: { vi: "Sức khoẻ Feeder & Nozzle / Nhật ký bảo dưỡng", en: "Feeder & Nozzle Health / Maintenance Log" },
    summary: {
      vi: "Tỉ lệ hút hỏng (mispick) từng feeder / nozzle so với mục tiêu, hạn bảo dưỡng PM, cảnh báo đỏ / vàng để rút thiết bị ra khỏi line trước khi gây lỗi.",
      en: "Mispick rate per feeder / nozzle vs target, PM due dates, red / amber alerts to pull equipment before it causes defects."
    },
    sections: { vi: ["Tổng quan trạng thái", "Top mispick", "Lịch PM sắp đến hạn", "Danh sách chi tiết"], en: ["Health overview", "Top mispick", "Upcoming PM", "Detail list"] },
    formulas: ["Mispick rate = Mispicks / Picks", "Đỏ: > 2× mục tiêu hoặc quá hạn PM · Vàng: > mục tiêu hoặc PM ≤ 7 ngày"],
    inputs: ["Danh mục Feeder / Nozzle", "Nhật ký Feeder / Nozzle"]
  }
];

export const findTemplate = (slug: string) => REPORT_TEMPLATES.find((t) => t.slug === slug);
