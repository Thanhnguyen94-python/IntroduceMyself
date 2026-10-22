// Bảng giải thích từ viết tắt / thuật ngữ cho Sổ tay SMT (nút "?" cạnh từ).
// Dùng chung client + server. Thêm từ: thêm 1 dòng; `alias` = cách viết khác cùng nghĩa.

export type GlossaryTerm = { term: string; full: string; vi: string; en: string; alias?: string[] };

export const GLOSSARY: GlossaryTerm[] = [
  { term: "SMT", full: "Surface Mount Technology", vi: "Công nghệ dán linh kiện lên bề mặt mạch in.", en: "Mounting components directly onto the PCB surface." },
  { term: "SMD", full: "Surface Mount Device", vi: "Linh kiện dán bề mặt (điện trở, tụ, IC…).", en: "A component made for surface mounting." },
  { term: "THT", full: "Through-Hole Technology", vi: "Linh kiện có chân cắm xuyên lỗ mạch.", en: "Components with leads inserted through PCB holes." },
  { term: "PIP", full: "Pin-in-Paste", vi: "Hàn linh kiện chân cắm bằng kem hàn trong lò reflow, không cần hàn sóng.", en: "Reflow-soldering through-hole parts with paste printed into the holes." },
  { term: "PCB", full: "Printed Circuit Board", vi: "Bo mạch in (chưa gắn linh kiện).", en: "The bare printed circuit board." },
  { term: "PCBA", full: "PCB Assembly", vi: "Bo mạch đã gắn và hàn linh kiện.", en: "A PCB with components assembled and soldered." },
  { term: "SPI", full: "Solder Paste Inspection", vi: "Máy đo 3D thể tích / chiều cao / diện tích kem hàn sau khi in.", en: "3D measurement of printed solder paste." },
  { term: "AOI", full: "Automated Optical Inspection", vi: "Máy kiểm tra ngoại quan bằng camera (thiếu, lệch, cầu hàn…).", en: "Camera-based visual inspection." },
  { term: "AXI", full: "Automated X-ray Inspection", vi: "Kiểm tra bằng tia X – thấy mối hàn bị che như BGA, QFN.", en: "X-ray inspection for hidden joints (BGA, QFN)." },
  { term: "ICT", full: "In-Circuit Test", vi: "Test điện từng linh kiện trên bo bằng kim dò.", en: "Electrical test of each component via a bed of nails." },
  { term: "FCT", full: "Functional Test", vi: "Test chức năng bo như khi dùng thật.", en: "Testing the board's real function." },
  { term: "BGA", full: "Ball Grid Array", vi: "IC có chân là các bi hàn bên dưới thân.", en: "Package with solder balls underneath." },
  { term: "QFN", full: "Quad Flat No-lead", vi: "IC không chân, pad nằm dưới thân và 4 cạnh.", en: "Leadless package with pads under the body." },
  { term: "QFP", full: "Quad Flat Package", vi: "IC chân cánh tiên ra 4 cạnh.", en: "Package with gull-wing leads on 4 sides." },
  { term: "OEE", full: "Overall Equipment Effectiveness", vi: "Hiệu suất thiết bị tổng thể = Sẵn sàng × Hiệu năng × Chất lượng.", en: "Availability × Performance × Quality." },
  { term: "FPY", full: "First Pass Yield", vi: "Tỉ lệ bo đạt ngay lần đầu, không phải sửa.", en: "Share of units passing the first time without rework." },
  { term: "RTY", full: "Rolled Throughput Yield", vi: "Yield xuyên suốt = tích FPY các công đoạn.", en: "Product of the FPY of every step." },
  { term: "DPMO", full: "Defects Per Million Opportunities", vi: "Số lỗi trên 1 triệu cơ hội lỗi (thường tính theo điểm hàn).", en: "Defects per million opportunities (often per joint)." },
  { term: "PPM", full: "Parts Per Million", vi: "Số phần triệu – số lỗi trên 1 triệu sản phẩm / điểm.", en: "Parts per million." },
  { term: "DPU", full: "Defects Per Unit", vi: "Số lỗi trung bình trên 1 sản phẩm.", en: "Average defects per unit." },
  { term: "SPC", full: "Statistical Process Control", vi: "Kiểm soát quá trình bằng thống kê (biểu đồ kiểm soát).", en: "Controlling a process with statistics (control charts)." },
  { term: "Cpk", full: "Process Capability Index", vi: "Chỉ số năng lực quá trình có tính độ lệch tâm; ≥ 1,33 là ổn.", en: "Capability index including centering; ≥ 1.33 is good." },
  { term: "Cp", full: "Process Capability", vi: "Năng lực quá trình: độ rộng dung sai so với 6σ, chưa tính lệch tâm.", en: "Tolerance width vs 6σ, ignoring centering." },
  { term: "USL", full: "Upper Spec Limit", vi: "Giới hạn trên của dung sai (do khách hàng / thiết kế).", en: "Upper specification limit." },
  { term: "LSL", full: "Lower Spec Limit", vi: "Giới hạn dưới của dung sai.", en: "Lower specification limit." },
  { term: "UCL", full: "Upper Control Limit", vi: "Giới hạn kiểm soát trên – tính từ dữ liệu quá trình (±3σ).", en: "Upper control limit from process data (±3σ)." },
  { term: "LCL", full: "Lower Control Limit", vi: "Giới hạn kiểm soát dưới.", en: "Lower control limit." },
  { term: "UPH", full: "Units Per Hour", vi: "Số sản phẩm / board làm được mỗi giờ.", en: "Units (boards) per hour." },
  { term: "CPH", full: "Components Per Hour", vi: "Số linh kiện máy gắn được mỗi giờ.", en: "Components placed per hour." },
  { term: "CT", full: "Cycle Time", vi: "Thời gian một trạm làm xong 1 board / panel.", en: "Time for one station to finish a board / panel." },
  { term: "Takt", full: "Takt time", vi: "Nhịp khách hàng cần = thời gian có sẵn / nhu cầu.", en: "Available time ÷ customer demand.", alias: ["takt"] },
  { term: "MTBF", full: "Mean Time Between Failures", vi: "Thời gian chạy trung bình giữa 2 lần hỏng.", en: "Average run time between failures." },
  { term: "MTTR", full: "Mean Time To Repair", vi: "Thời gian sửa trung bình mỗi lần hỏng.", en: "Average time to repair." },
  { term: "TPM", full: "Total Productive Maintenance", vi: "Bảo trì năng suất toàn diện – mọi người cùng giữ máy tốt.", en: "Total productive maintenance." },
  { term: "SMED", full: "Single-Minute Exchange of Die", vi: "Phương pháp rút ngắn thời gian đổi model / chuyển đổi.", en: "Method to shorten changeover time." },
  { term: "TAL", full: "Time Above Liquidus", vi: "Thời gian mối hàn ở trên nhiệt độ nóng chảy của kem (≈ 217 °C với SAC305).", en: "Time the joint stays above the alloy's liquidus." },
  { term: "SAC305", full: "Sn96.5 Ag3.0 Cu0.5", vi: "Hợp kim hàn không chì phổ biến nhất (thiếc–bạc–đồng).", en: "The most common lead-free solder alloy." },
  { term: "IMC", full: "Intermetallic Compound", vi: "Lớp hợp chất liên kim giữa thiếc và đồng – tạo liên kết mối hàn.", en: "Intermetallic layer that bonds the joint." },
  { term: "MSL", full: "Moisture Sensitivity Level", vi: "Cấp nhạy ẩm của linh kiện – quyết định được để ngoài bao bao lâu.", en: "How long a part may stay out of dry pack." },
  { term: "HIC", full: "Humidity Indicator Card", vi: "Thẻ chỉ thị độ ẩm trong túi chống ẩm.", en: "Card showing humidity inside the dry bag." },
  { term: "MBB", full: "Moisture Barrier Bag", vi: "Túi chống ẩm hút chân không đựng linh kiện.", en: "Moisture barrier bag." },
  { term: "ESD", full: "Electrostatic Discharge", vi: "Phóng tĩnh điện – có thể làm hỏng linh kiện mà mắt không thấy.", en: "Electrostatic discharge." },
  { term: "EPA", full: "ESD Protected Area", vi: "Khu vực được bảo vệ chống tĩnh điện.", en: "ESD protected area." },
  { term: "IPC", full: "IPC – Association Connecting Electronics Industries", vi: "Hiệp hội ban hành tiêu chuẩn điện tử (IPC-A-610, J-STD-001…).", en: "Body publishing electronics standards." },
  { term: "IPC-A-610", full: "Acceptability of Electronic Assemblies", vi: "Tiêu chuẩn chấp nhận ngoại quan bo mạch đã lắp ráp.", en: "Acceptance criteria for assembled boards." },
  { term: "J-STD-001", full: "Requirements for Soldered Assemblies", vi: "Tiêu chuẩn yêu cầu quy trình và vật liệu hàn.", en: "Requirements for soldering processes and materials." },
  { term: "FIFO", full: "First In, First Out", vi: "Vào trước dùng trước – tránh vật tư quá hạn.", en: "First in, first out." },
  { term: "MES", full: "Manufacturing Execution System", vi: "Hệ thống điều hành sản xuất – truy xuất, kiểm soát vật tư, sản lượng.", en: "Manufacturing execution system." },
  { term: "NPI", full: "New Product Introduction", vi: "Giai đoạn đưa sản phẩm mới vào sản xuất.", en: "New product introduction." },
  { term: "ECN", full: "Engineering Change Notice", vi: "Thông báo thay đổi kỹ thuật.", en: "Engineering change notice." },
  { term: "RCA", full: "Root Cause Analysis", vi: "Phân tích nguyên nhân gốc.", en: "Root cause analysis." },
  { term: "8D", full: "8 Disciplines", vi: "Quy trình 8 bước giải quyết vấn đề (từ lập nhóm tới phòng ngừa tái phát).", en: "8-step problem-solving method." },
  { term: "4M1E", full: "Man, Machine, Material, Method, Environment", vi: "5 nhóm nguyên nhân: Người, Máy, Vật liệu, Phương pháp, Môi trường.", en: "Man, machine, material, method, environment." },
  { term: "FMEA", full: "Failure Mode and Effects Analysis", vi: "Phân tích dạng lỗi và tác động – đánh giá rủi ro trước khi xảy ra.", en: "Failure mode and effects analysis." },
  { term: "RPN", full: "Risk Priority Number", vi: "Điểm ưu tiên rủi ro = Mức nghiêm trọng × Tần suất × Khả năng phát hiện.", en: "Severity × Occurrence × Detection." },
  { term: "PDCA", full: "Plan – Do – Check – Act", vi: "Vòng cải tiến: Lập kế hoạch – Làm – Kiểm tra – Chuẩn hoá.", en: "Plan, do, check, act." },
  { term: "5S", full: "Sort, Set, Shine, Standardize, Sustain", vi: "Sàng lọc – Sắp xếp – Sạch sẽ – Săn sóc – Sẵn sàng.", en: "Workplace organisation method." },
  { term: "Poka-yoke", full: "Mistake-proofing", vi: "Chống sai lỗi – thiết kế để không thể làm sai.", en: "Mistake-proofing.", alias: ["poka-yoke"] },
  { term: "Pareto", full: "Pareto chart (80/20)", vi: "Biểu đồ xếp lỗi từ nhiều đến ít – tập trung vào ~20% nguyên nhân gây ~80% lỗi.", en: "Ranked bar chart – focus on the vital few." },
  { term: "Fiducial", full: "Fiducial mark", vi: "Dấu căn chỉnh trên bo để camera máy xác định toạ độ.", en: "Alignment mark read by machine cameras.", alias: ["fiducial"] },
  { term: "Area ratio", full: "Stencil area ratio", vi: "Diện tích lỗ mở / diện tích thành lỗ stencil; ≥ 0,66 để kem nhả tốt.", en: "Aperture area ÷ wall area; ≥ 0.66 for good release." },
  { term: "Tombstone", full: "Tombstoning", vi: "Lỗi linh kiện chip dựng đứng một đầu (bia mộ).", en: "Chip part standing up on one end.", alias: ["tombstone", "tombstoning"] },
  { term: "Voiding", full: "Solder voids", vi: "Lỗ rỗng khí bên trong mối hàn (hay gặp ở BGA, QFN).", en: "Gas voids inside solder joints.", alias: ["void", "voids"] },
  { term: "HiP", full: "Head-in-Pillow", vi: "Lỗi BGA: bi hàn và kem chạm nhau nhưng không chảy hoà làm một.", en: "BGA defect: ball and paste touch but don't coalesce." }
];

const byKey = new Map<string, GlossaryTerm>();
for (const g of GLOSSARY) for (const k of [g.term, ...(g.alias ?? [])]) byKey.set(k, g);

export const glossaryEntry = (key: string) => byKey.get(key);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Từ dài trước (IPC-A-610 trước IPC); không khớp giữa chữ khác ("CT" trong "OCT", "Cp" trong "Cpk").
const TERM_RE = new RegExp(
  `(?<![\\p{L}\\p{N}_-])(${[...byKey.keys()].sort((a, b) => b.length - a.length).map(escape).join("|")})(?![\\p{L}\\p{N}_])`,
  "gu"
);

export type GlossPart = string | { text: string; key: string };

// Tách chuỗi thành đoạn thường + từ cần giải thích (mỗi thuật ngữ chỉ đánh dấu lần đầu, theo `seen`).
export function splitGloss(text: string, seen = new Set<string>()): GlossPart[] {
  const out: GlossPart[] = [];
  let last = 0;
  for (const m of text.matchAll(TERM_RE)) {
    const g = byKey.get(m[1])!;
    if (seen.has(g.term)) continue;
    seen.add(g.term);
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ text: m[1], key: g.term });
    last = m.index + m[1].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const SKIP_TAGS = new Set(["pre", "code", "a", "button", "h1", "h2", "h3", "script", "style"]);

// Chèn nút "?" sau thuật ngữ trong HTML đã render (Markdown). Bỏ qua code, link, tiêu đề.
export function glossHtml(html: string, seen = new Set<string>()) {
  let skip = 0;
  return html
    .split(/(<[^>]+>)/)
    .map((chunk) => {
      if (chunk.startsWith("<")) {
        const m = /^<(\/)?([a-z0-9]+)/i.exec(chunk);
        if (m && SKIP_TAGS.has(m[2].toLowerCase()) && !chunk.endsWith("/>")) skip = Math.max(0, skip + (m[1] ? -1 : 1));
        return chunk;
      }
      if (skip > 0 || !chunk.trim()) return chunk;
      return splitGloss(chunk, seen)
        .map((p) => (typeof p === "string" ? p : `${p.text}<button type="button" class="gloss-q" data-gloss="${p.key}" aria-label="? ${p.key}">?</button>`))
        .join("");
    })
    .join("");
}
