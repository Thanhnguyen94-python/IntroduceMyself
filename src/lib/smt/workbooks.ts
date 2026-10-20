import { CHANGE_CATEGORIES, DETECT_POINTS, EIGHT_D_STATUS, FISHBONE_BRANCHES, SMT_PROCESSES, dmy, emptyEightDContent } from "@/lib/smt/types";
import type { EightDReport, ReportSlug, SmtSettings } from "@/lib/smt/types";
import { DATASETS, type DatasetKey } from "@/lib/smt/datasets";
import type { AssetHealth, BalanceResult, buildChangeMatrix, buildOeeReport, buildYieldReport } from "@/lib/smt/metrics";
import { colName, type Cell, type Sheet } from "@/lib/smt/xlsx";

// Nội dung các file Excel: mẫu trống (có công thức + danh sách chọn) và báo cáo đã điền số liệu.

const ROWS = 300; // số dòng nhập liệu có sẵn công thức trong mẫu trống
const H = (v: string): Cell => ({ v, s: "header" });
const T = (v: string): Cell => ({ v, s: "title" });
const N = (v: string): Cell => ({ v, s: "note" });
const S = (v: string): Cell => ({ v, s: "section" });
const I = (v: string | number = ""): Cell => ({ v, s: "input" });

function header(title: string, settings: SmtSettings, extra: string[] = []): Cell[][] {
  return [[T(title)], [{ v: `${settings.company} · SMT Engineering Report & Toolkit`, s: "subtitle" }], ...extra.map((e) => [N(e)]), []];
}

function instructions(title: string, lines: string[]): Sheet {
  return {
    name: "Hướng dẫn",
    widths: [110],
    rows: [[T(title)], [], ...lines.map((l) => [l.startsWith("#") ? S(l.slice(1).trim()) : N(l)])]
  };
}

// ===================== MẪU TRỐNG =====================

export function blankTemplate(slug: ReportSlug, settings: SmtSettings): Sheet[] {
  const lines = settings.lines.map((l) => l.code);
  const codes = settings.defectCatalog.map((d) => d.code);
  switch (slug) {
    case "oee-line-balance":
      return [oeeInstructions(), oeeLogSheet(lines, settings), lineBalanceSheet(settings), oeeSummarySheet()];
    case "yield-pareto":
      return [yieldInstructions(), yieldProductionSheet(lines), yieldDefectSheet(lines, codes), paretoSheet(settings), defectCatalogSheet(settings)];
    case "feeder-nozzle":
      return [feederInstructions(settings), assetSheet(), usageSheet()];
    case "4m1e":
      return [changeInstructions(), changeLogSheet(lines), changeMatrixSheet()];
    case "8d":
      return [eightDSheet(null, settings), eightDGuide()];
  }
}

function oeeInstructions() {
  return instructions("OEE & Line Balance – Hướng dẫn", [
    "# Cách dùng",
    "1. Sheet 'Nhật ký SX': mỗi dòng = 1 line × 1 ca × 1 model. Chỉ nhập các ô nền vàng, các cột còn lại tự tính.",
    "2. Sheet 'Line Balance': nhập cycle time đo được của từng trạm (giây). Bottleneck, hiệu suất cân bằng, UPH tự tính.",
    "3. Sheet 'Tổng hợp': OEE tổng của toàn bộ dữ liệu đã nhập.",
    "# Công thức",
    "Availability (A) = (Thời gian kế hoạch − Dừng máy) / Thời gian kế hoạch",
    "Performance (P) = (Cycle time chuẩn × Tổng sản lượng) / Thời gian chạy   (giới hạn tối đa 100%)",
    "Quality (Q) = Board đạt lần đầu / Tổng sản lượng",
    "OEE = A × P × Q   ·   Chuẩn thế giới (world-class) ≈ 85%",
    "Line balance efficiency = Σ CT các trạm / (Số trạm × CT trạm chậm nhất)",
    "Takt time = Thời gian sẵn có / Nhu cầu khách hàng. Trạm có CT > Takt là điểm nghẽn phải xử lý."
  ]);
}

function oeeLogSheet(lines: string[], settings: SmtSettings): Sheet {
  const head = ["Ngày (Date)", "Ca (Shift)", "Line", "Model", "Kế hoạch (phút)", "Dừng máy (phút)", "Lý do dừng", "CT chuẩn (s)", "Tổng SL (board)", "Đạt lần đầu", "Availability", "Performance", "Quality", "OEE"];
  const rows: Cell[][] = [head.map(H)];
  for (let r = 2; r <= ROWS + 1; r++) {
    rows.push([
      I(), I(), I(), I(), I(), I(), I(), I(), I(), I(),
      { f: `IF(OR(E${r}="",E${r}=0),"",(E${r}-F${r})/E${r})`, s: "pct" },
      { f: `IF(OR(E${r}="",E${r}-F${r}<=0),"",MIN(1,H${r}*I${r}/60/(E${r}-F${r})))`, s: "pct" },
      { f: `IF(OR(I${r}="",I${r}=0),"",J${r}/I${r})`, s: "pct" },
      { f: `IF(OR(K${r}="",L${r}="",M${r}=""),"",K${r}*L${r}*M${r})`, s: "pct" }
    ]);
  }
  return {
    name: "Nhật ký SX",
    rows,
    widths: [12, 8, 8, 14, 12, 12, 24, 10, 12, 12, 11, 12, 10, 10],
    freezeRows: 1,
    landscape: true,
    validations: [
      { range: `B2:B${ROWS + 1}`, list: settings.shifts },
      { range: `C2:C${ROWS + 1}`, list: lines }
    ]
  };
}

function lineBalanceSheet(settings: SmtSettings): Sheet {
  const rows: Cell[][] = [
    [T("Line Balance / Cycle Time Bottleneck")],
    [N("Nhập CT (giây) từng trạm vào ô vàng. Mỗi khối = 1 line × 1 model.")],
    []
  ];
  for (const line of settings.lines) {
    const start = rows.length + 1;
    rows.push([S(`${line.name} – Model:`), I(), S("Takt (s):"), I(line.taktSec)]);
    rows.push(["Trạm (Station)", "CT (s)", "% so với Takt", "Bottleneck?"].map(H));
    const first = rows.length + 1;
    const stations = [...line.stations, "", ""];
    stations.forEach((st) => {
      const r = rows.length + 1;
      rows.push([I(st), I(), { f: `IF(OR(B${r}="",$D$${start}=""),"",B${r}/$D$${start})`, s: "pct" }, { f: `IF(B${r}="","",IF(B${r}=MAX($B$${first}:$B$${first + stations.length - 1}),"◀ BOTTLENECK",""))`, s: "text" }]);
    });
    const last = rows.length;
    rows.push([{ v: "CT lớn nhất (bottleneck)", s: "bold" }, { f: `MAX(B${first}:B${last})`, s: "dec" }]);
    rows.push([{ v: "Line balance efficiency", s: "bold" }, { f: `IF(MAX(B${first}:B${last})=0,"",SUM(B${first}:B${last})/(COUNT(B${first}:B${last})*MAX(B${first}:B${last})))`, s: "pct" }]);
    rows.push([{ v: "UPH tối đa (board/giờ)", s: "bold" }, { f: `IF(MAX(B${first}:B${last})=0,"",3600/MAX(B${first}:B${last}))`, s: "int" }]);
    rows.push([{ v: "Đạt takt?", s: "bold" }, { f: `IF(MAX(B${first}:B${last})=0,"",IF(MAX(B${first}:B${last})<=D${start},"ĐẠT","KHÔNG ĐẠT – cần cân bằng lại"))`, s: "text" }]);
    rows.push([]);
  }
  return { name: "Line Balance", rows, widths: [30, 12, 16, 18] };
}

function oeeSummarySheet(): Sheet {
  const L = `'Nhật ký SX'!`;
  const r = (col: string) => `${L}${col}2:${col}${ROWS + 1}`;
  return {
    name: "Tổng hợp",
    widths: [34, 16],
    rows: [
      [T("Tổng hợp OEE")],
      [],
      [H("Chỉ số"), H("Giá trị")],
      [{ v: "Tổng thời gian kế hoạch (phút)", s: "bold" }, { f: `SUM(${r("E")})`, s: "int" }],
      [{ v: "Tổng dừng máy (phút)", s: "bold" }, { f: `SUM(${r("F")})`, s: "int" }],
      [{ v: "Tổng sản lượng (board)", s: "bold" }, { f: `SUM(${r("I")})`, s: "int" }],
      [{ v: "Đạt lần đầu (board)", s: "bold" }, { f: `SUM(${r("J")})`, s: "int" }],
      [{ v: "Availability", s: "bold" }, { f: `IF(B4=0,"",(B4-B5)/B4)`, s: "pct" }],
      [{ v: "Performance", s: "bold" }, { f: `IF(B4-B5<=0,"",MIN(1,SUMPRODUCT(${r("H")},${r("I")})/60/(B4-B5)))`, s: "pct" }],
      [{ v: "Quality (FPY)", s: "bold" }, { f: `IF(B6=0,"",B7/B6)`, s: "pct" }],
      [{ v: "OEE", s: "bold" }, { f: `IF(OR(B8="",B9="",B10=""),"",B8*B9*B10)`, s: "pct" }]
    ]
  };
}

function yieldInstructions() {
  return instructions("Quality Yield & Defect Pareto – Hướng dẫn", [
    "# Cách dùng",
    "1. 'Sản lượng': số board và board đạt lần đầu theo ngày / line / model. Cơ hội lỗi = số mối hàn trên 1 board.",
    "2. 'Lỗi': mỗi dòng 1 loại lỗi tại 1 vị trí (RefDes). Chọn mã lỗi theo danh sách (sheet 'Danh mục lỗi').",
    "3. 'Pareto': tự cộng số lỗi theo mã. Sắp xếp giảm dần cột 'Số lỗi' (Data → Sort) để xem Pareto 80/20.",
    "# Công thức",
    "FPY (First Pass Yield) = Board đạt lần đầu / Tổng board",
    "PPM (board) = (Tổng board − Board đạt) / Tổng board × 1.000.000",
    "DPMO = Tổng điểm lỗi / (Tổng board × Cơ hội lỗi mỗi board) × 1.000.000",
    "Pareto: % tích luỹ = Σ số lỗi các mã đứng trước / Tổng số lỗi. Tập trung xử lý các mã chiếm ~80% đầu tiên."
  ]);
}

function yieldProductionSheet(lines: string[]): Sheet {
  const rows: Cell[][] = [["Ngày (Date)", "Line", "Model", "Tổng board", "Đạt lần đầu", "Cơ hội lỗi / board", "FPY", "PPM (board)"].map(H)];
  for (let r = 2; r <= ROWS + 1; r++) {
    rows.push([I(), I(), I(), I(), I(), I(), { f: `IF(OR(D${r}="",D${r}=0),"",E${r}/D${r})`, s: "pct" }, { f: `IF(OR(D${r}="",D${r}=0),"",(D${r}-E${r})/D${r}*1000000)`, s: "int" }]);
  }
  return { name: "Sản lượng", rows, widths: [12, 8, 14, 12, 12, 16, 10, 12], freezeRows: 1, validations: [{ range: `B2:B${ROWS + 1}`, list: lines }] };
}

function yieldDefectSheet(lines: string[], codes: string[]): Sheet {
  const rows: Cell[][] = [["Ngày (Date)", "Line", "Model", "Mã lỗi", "Vị trí (RefDes)", "Phát hiện tại", "Số lượng", "Nguyên nhân / hành động"].map(H)];
  for (let r = 2; r <= ROWS + 1; r++) rows.push([I(), I(), I(), I(), I(), I(), I(), I()]);
  return {
    name: "Lỗi",
    rows,
    widths: [12, 8, 14, 10, 14, 13, 10, 40],
    freezeRows: 1,
    validations: [
      { range: `B2:B${ROWS + 1}`, list: lines },
      { range: `D2:D${ROWS + 1}`, list: codes },
      { range: `F2:F${ROWS + 1}`, list: [...DETECT_POINTS] }
    ]
  };
}

function paretoSheet(settings: SmtSettings): Sheet {
  const n = settings.defectCatalog.length;
  const rows: Cell[][] = [
    [T("Defect Pareto")],
    [N("Số lỗi tự cộng từ sheet 'Lỗi'. Sắp xếp giảm dần theo cột C rồi đọc cột F (% tích luỹ).")],
    ["Mã lỗi", "Tên lỗi", "Số lỗi", "% tổng", "Hạng", "% tích luỹ (sau khi sắp xếp)"].map(H)
  ];
  settings.defectCatalog.forEach((d, i) => {
    const r = i + 4;
    rows.push([
      { v: d.code, s: "bold" },
      { v: d.vi, s: "text" },
      { f: `SUMIF('Lỗi'!$D$2:$D$${ROWS + 1},A${r},'Lỗi'!$G$2:$G$${ROWS + 1})`, s: "int" },
      { f: `IF(SUM($C$4:$C$${n + 3})=0,"",C${r}/SUM($C$4:$C$${n + 3}))`, s: "pct" },
      { f: `RANK(C${r},$C$4:$C$${n + 3})`, s: "int" },
      { f: `IF(SUM($C$4:$C$${n + 3})=0,"",SUM($C$4:C${r})/SUM($C$4:$C$${n + 3}))`, s: "pct" }
    ]);
  });
  rows.push([], [{ v: "Tổng điểm lỗi", s: "bold" }, "", { f: `SUM(C4:C${n + 3})`, s: "int" }]);
  rows.push([{ v: "FPY", s: "bold" }, "", { f: `IF(SUM('Sản lượng'!D2:D${ROWS + 1})=0,"",SUM('Sản lượng'!E2:E${ROWS + 1})/SUM('Sản lượng'!D2:D${ROWS + 1}))`, s: "pct" }]);
  rows.push([{ v: "DPMO", s: "bold" }, "", { f: `IF(SUMPRODUCT('Sản lượng'!D2:D${ROWS + 1},'Sản lượng'!F2:F${ROWS + 1})=0,"",C${n + 5}/SUMPRODUCT('Sản lượng'!D2:D${ROWS + 1},'Sản lượng'!F2:F${ROWS + 1})*1000000)`, s: "int" }]);
  return { name: "Pareto", rows, widths: [10, 30, 10, 10, 8, 22] };
}

function defectCatalogSheet(settings: SmtSettings): Sheet {
  const proc = (id: string) => SMT_PROCESSES.find((p) => p.id === id)?.vi ?? id;
  return {
    name: "Danh mục lỗi",
    widths: [10, 30, 30, 24],
    rows: [["Mã", "Tên (VI)", "Name (EN)", "Công đoạn"].map(H), ...settings.defectCatalog.map((d) => [{ v: d.code, s: "bold" as const }, { v: d.vi, s: "text" as const }, { v: d.en, s: "text" as const }, { v: proc(d.process), s: "text" as const }])]
  };
}

function feederInstructions(settings: SmtSettings) {
  return instructions("Feeder & Nozzle Health – Hướng dẫn", [
    "# Cách dùng",
    "1. 'Danh mục': mỗi feeder / nozzle 1 dòng. Nhập ngày PM gần nhất và chu kỳ PM → hạn PM & trạng thái tự tính.",
    "2. 'Nhật ký hút': số lần hút (picks) và hút hỏng (mispicks) lấy từ log máy theo ngày / tuần.",
    "# Quy tắc đánh giá",
    `Mispick rate = Mispicks / Picks. Mục tiêu hiện tại: ≤ ${(settings.targets.mispickRate * 100).toFixed(2)}%.`,
    "ĐỎ (critical): mispick > 2× mục tiêu, hoặc quá hạn PM, hoặc kiểm tra NG → rút ra khỏi line, sửa / hiệu chuẩn.",
    "VÀNG (warning): mispick > mục tiêu, hoặc PM đến hạn trong 7 ngày → lên kế hoạch PM.",
    "XANH (good): trong giới hạn."
  ]);
}

function assetSheet(): Sheet {
  const rows: Cell[][] = [["Loại", "Mã (S/N)", "Quy cách", "Máy / vị trí", "PM gần nhất", "Chu kỳ PM (ngày)", "Hạn PM tiếp theo", "Còn (ngày)", "Trạng thái PM"].map(H)];
  for (let r = 2; r <= ROWS + 1; r++) {
    rows.push([
      I(), I(), I(), I(), I(), I(),
      { f: `IF(OR(E${r}="",F${r}=""),"",TEXT(E${r}+F${r},"yyyy-mm-dd"))`, s: "text" },
      { f: `IF(OR(E${r}="",F${r}=""),"",E${r}+F${r}-TODAY())`, s: "int" },
      { f: `IF(H${r}="","",IF(H${r}<0,"QUÁ HẠN",IF(H${r}<=7,"SẮP ĐẾN HẠN","OK")))`, s: "text" }
    ]);
  }
  return {
    name: "Danh mục",
    rows,
    widths: [9, 12, 11, 16, 13, 14, 16, 10, 15],
    freezeRows: 1,
    validations: [{ range: `A2:A${ROWS + 1}`, list: ["feeder", "nozzle"] }]
  };
}

function usageSheet(): Sheet {
  const rows: Cell[][] = [["Ngày", "Mã (S/N)", "Sự kiện", "Picks", "Mispicks", "Mispick rate", "Kết quả", "Kỹ thuật viên", "Ghi chú"].map(H)];
  for (let r = 2; r <= ROWS + 1; r++) {
    rows.push([I(), I(), I(), I(), I(), { f: `IF(OR(D${r}="",D${r}=0),"",E${r}/D${r})`, s: "pct" }, I(), I(), I()]);
  }
  return {
    name: "Nhật ký hút",
    rows,
    widths: [12, 12, 13, 10, 10, 12, 9, 16, 30],
    freezeRows: 1,
    validations: [
      { range: `C2:C${ROWS + 1}`, list: ["usage", "pm", "repair", "calibration", "inspection"] },
      { range: `G2:G${ROWS + 1}`, list: ["ok", "ng"] }
    ]
  };
}

function changeInstructions() {
  return instructions("4M1E Change Management – Hướng dẫn", [
    "# Khi nào phải khai báo?",
    "Man: operator / kỹ thuật viên mới hoặc thay đổi vị trí vận hành trạm quan trọng (Printer, AOI).",
    "Machine: thay máy, thay head / camera, sửa chữa lớn, đổi chương trình máy, đổi stencil / jig.",
    "Material: đổi lot kem hàn, linh kiện 2nd source, đổi nhà cung cấp PCB.",
    "Method: đổi profile lò, thông số in, chương trình SPI / AOI, quy trình thao tác (WI).",
    "Environment: nhiệt độ / độ ẩm, ESD, chuyển line, thay đổi layout.",
    "# Quy trình",
    "Đề xuất → đánh giá rủi ro (Thấp / TB / Cao) → kế hoạch xác nhận (FAI, SPI Cpk, AOI 100% lô đầu…) → áp dụng → xác nhận OK/NG → đóng.",
    "Rủi ro Cao: bắt buộc FAI + duyệt QA trước khi chạy hàng loạt, thông báo khách hàng nếu hợp đồng yêu cầu (PCN)."
  ]);
}

function changeLogSheet(lines: string[]): Sheet {
  const rows: Cell[][] = [["Mã", "Ngày áp dụng", "Hạng mục (4M1E)", "Line", "Model", "Nội dung thay đổi", "Trước", "Sau", "Lý do", "Rủi ro", "Kế hoạch xác nhận", "Kết quả", "Trạng thái", "Phụ trách", "Duyệt"].map(H)];
  for (let r = 2; r <= ROWS + 1; r++) rows.push(Array.from({ length: 15 }, () => I()));
  return {
    name: "Nhật ký thay đổi",
    rows,
    widths: [12, 12, 14, 7, 12, 30, 20, 20, 22, 9, 30, 9, 13, 12, 12],
    freezeRows: 1,
    landscape: true,
    validations: [
      { range: `C2:C${ROWS + 1}`, list: CHANGE_CATEGORIES.map((c) => c.id) },
      { range: `D2:D${ROWS + 1}`, list: lines },
      { range: `J2:J${ROWS + 1}`, list: ["low", "medium", "high"] },
      { range: `L2:L${ROWS + 1}`, list: ["pending", "ok", "ng"] },
      { range: `M2:M${ROWS + 1}`, list: ["planned", "implemented", "verified", "rejected"] }
    ]
  };
}

function changeMatrixSheet(): Sheet {
  const L = `'Nhật ký thay đổi'!`;
  const rng = (c: string) => `${L}$${c}$2:$${c}$${ROWS + 1}`;
  const rows: Cell[][] = [[T("Ma trận 4M1E")], [], ["Hạng mục", "Tổng", "Kế hoạch", "Đã áp dụng", "Đã xác nhận", "Từ chối", "Rủi ro cao", "Chờ xác nhận", "NG"].map(H)];
  CHANGE_CATEGORIES.forEach((c) => {
    rows.push([
      { v: `${c.short} – ${c.vi}`, s: "bold" },
      { f: `COUNTIF(${rng("C")},"${c.id}")`, s: "int" },
      { f: `COUNTIFS(${rng("C")},"${c.id}",${rng("M")},"planned")`, s: "int" },
      { f: `COUNTIFS(${rng("C")},"${c.id}",${rng("M")},"implemented")`, s: "int" },
      { f: `COUNTIFS(${rng("C")},"${c.id}",${rng("M")},"verified")`, s: "int" },
      { f: `COUNTIFS(${rng("C")},"${c.id}",${rng("M")},"rejected")`, s: "int" },
      { f: `COUNTIFS(${rng("C")},"${c.id}",${rng("J")},"high")`, s: "int" },
      { f: `COUNTIFS(${rng("C")},"${c.id}",${rng("L")},"pending")`, s: "int" },
      { f: `COUNTIFS(${rng("C")},"${c.id}",${rng("L")},"ng")`, s: "int" }
    ]);
  });
  rows.push([{ v: "Tổng", s: "bold" }, ...["B", "C", "D", "E", "F", "G", "H", "I"].map((c): Cell => ({ f: `SUM(${c}4:${c}8)`, s: "int" }))]);
  return { name: "Ma trận 4M1E", rows, widths: [26, 8, 10, 12, 12, 9, 11, 13, 6] };
}

function eightDGuide() {
  return instructions("8D Problem Solving – Hướng dẫn (AIAG / VDA)", [
    "D0 Chuẩn bị: mô tả triệu chứng, hành động khẩn cấp (ERA), quyết định có cần 8D.",
    "D1 Lập nhóm: đa chức năng (SMT PE, QA, Sản xuất, Kỹ thuật thiết bị), có trưởng nhóm.",
    "D2 Mô tả vấn đề: 5W2H – What / Where / When / Who / Why / How / How many. Kết thúc bằng 1 câu Problem Statement.",
    "D3 Khoanh vùng tạm thời (ICA): cách ly hàng tồn, sort tại kho / khách, kiểm tra 100%.",
    "D4 Nguyên nhân gốc: Fishbone 6M → 5 Why cho cả 2 nhánh: vì sao XẢY RA và vì sao LỌT. Phải tái hiện được lỗi.",
    "D5 Chọn giải pháp khắc phục (PCA) & chứng minh hiệu quả trên mẫu.",
    "D6 Triển khai & xác nhận hiệu quả bằng số liệu (PPM trước / sau, thời gian theo dõi).",
    "D7 Phòng ngừa tái phát: cập nhật PFMEA, Control Plan, WI; áp dụng ngang (yokoten) cho model / line tương tự.",
    "D8 Ghi nhận nhóm, bài học kinh nghiệm, đóng 8D."
  ]);
}

// 8D dạng biểu mẫu (dùng cho cả mẫu trống và xuất 1 báo cáo đã điền).
export function eightDSheet(report: EightDReport | null, settings: SmtSettings): Sheet {
  const c = report?.content ?? emptyEightDContent();
  const v = (x: string | null | undefined): Cell => (report ? { v: x ?? "", s: "text" } : I());
  const rows: Cell[][] = [];
  const merges: string[] = [];
  const W = 6; // số cột A..F
  const span = (r: number, from = 1) => merges.push(`${colName(from)}${r}:${colName(W - 1)}${r}`);
  const push = (row: Cell[]) => {
    rows.push(row);
    return rows.length;
  };

  push([T(`8D Problem Solving Report${report ? ` – ${report.code}` : ""}`)]);
  push([{ v: `${settings.company} · AIAG 8D`, s: "subtitle" }]);
  push([]);
  const pairs: Array<[string, string | null | undefined, string, string | null | undefined]> = [
    ["Mã 8D", report?.code, "Trạng thái", report ? EIGHT_D_STATUS.find((s) => s.id === report.status)?.vi : ""],
    ["Tiêu đề", report?.title, "Mức độ", report?.severity],
    ["Khách hàng", report?.customer, "Line / Model", report ? `${report.line} / ${report.model}` : ""],
    ["Mã lỗi", report?.defect_code, "Trưởng nhóm", report?.owner],
    ["Ngày mở", dmy(report?.opened_on), "Hạn / Ngày đóng", report ? `${dmy(report.due_on)} / ${dmy(report.closed_on)}` : ""]
  ];
  for (const [a, b, cc, d] of pairs) {
    const r = push([{ v: a, s: "bold" }, v(b), "", { v: cc, s: "bold" }, v(d), ""]);
    merges.push(`B${r}:C${r}`, `E${r}:F${r}`);
  }

  const section = (title: string) => {
    push([]);
    const r = push([S(title), S(""), S(""), S(""), S(""), S("")]);
    span(r, 0);
  };
  const field = (label: string, value: string) => {
    const r = push([{ v: label, s: "bold" }, v(value), "", "", "", ""]);
    span(r);
  };
  const actions = (list: typeof c.d3.actions, blank = 4) => {
    push(["#", "Hành động", "", "Phụ trách", "Hạn", "Kết quả / trạng thái"].map(H));
    merges.push(`B${rows.length}:C${rows.length}`);
    const items = report ? list : Array.from({ length: blank }, () => null);
    items.forEach((a, i) => {
      const r = push([{ v: i + 1, s: "int" }, a ? { v: a.action, s: "text" } : I(), "", a ? { v: a.owner, s: "text" } : I(), a ? { v: dmy(a.due), s: "text" } : I(), a ? { v: `${a.status === "done" ? "✔ " : ""}${a.result}`, s: "text" } : I()]);
      merges.push(`B${r}:C${r}`);
    });
  };

  section("D0 – Chuẩn bị & hành động khẩn cấp (ERA)");
  field("Triệu chứng", c.d0.symptom);
  field("Hành động khẩn cấp", c.d0.emergencyAction);
  field("Cần 8D?", c.d0.need8d);

  section("D1 – Nhóm giải quyết vấn đề");
  push(["Họ tên", "", "Vai trò", "", "Bộ phận", ""].map(H));
  merges.push(`A${rows.length}:B${rows.length}`, `C${rows.length}:D${rows.length}`, `E${rows.length}:F${rows.length}`);
  (report ? c.d1.team : Array.from({ length: 5 }, () => null)).forEach((m) => {
    const r = push([m ? { v: m.name, s: "text" } : I(), "", m ? { v: m.role, s: "text" } : I(), "", m ? { v: m.dept, s: "text" } : I(), ""]);
    merges.push(`A${r}:B${r}`, `C${r}:D${r}`, `E${r}:F${r}`);
  });

  section("D2 – Mô tả vấn đề (5W2H)");
  field("What – Lỗi gì?", c.d2.what);
  field("Where – Ở đâu?", c.d2.where);
  field("When – Khi nào?", c.d2.when);
  field("Who – Ai phát hiện?", c.d2.who);
  field("Why – Vì sao là vấn đề?", c.d2.why);
  field("How – Biểu hiện thế nào?", c.d2.how);
  field("How many – Bao nhiêu?", c.d2.howMany);
  field("Problem statement", c.d2.statement);

  section("D3 – Hành động khoanh vùng tạm thời (ICA)");
  field("Kiểm tra tồn kho", c.d3.stockCheck);
  actions(c.d3.actions);

  section("D4 – Phân tích nguyên nhân gốc: Fishbone (6M)");
  push(FISHBONE_BRANCHES.map((b) => H(`${b.en} – ${b.vi}`)));
  const depth = report ? Math.max(1, ...FISHBONE_BRANCHES.map((b) => c.d4.fishbone[b.id].length)) : 4;
  for (let i = 0; i < depth; i++) push(FISHBONE_BRANCHES.map((b) => (report ? { v: c.d4.fishbone[b.id][i] ?? "", s: "text" } : I())));

  section("D4 – 5 Why");
  push(["#", "Vì sao XẢY RA (Occurrence)", "", "", "Vì sao LỌT (Escape)", ""].map(H));
  merges.push(`B${rows.length}:D${rows.length}`, `E${rows.length}:F${rows.length}`);
  for (let i = 0; i < 5; i++) {
    const r = push([{ v: `Why ${i + 1}`, s: "bold" }, v(c.d4.whyOccur[i] ?? ""), "", "", v(c.d4.whyEscape[i] ?? ""), ""]);
    merges.push(`B${r}:D${r}`, `E${r}:F${r}`);
  }
  field("Nguyên nhân gốc – xảy ra", c.d4.rootOccur);
  field("Nguyên nhân gốc – lọt", c.d4.rootEscape);
  field("Xác minh (tái hiện lỗi)", c.d4.verification);

  section("D5 – Chọn giải pháp khắc phục (PCA)");
  actions(c.d5.actions);
  section("D6 – Triển khai & xác nhận hiệu quả");
  actions(c.d6.actions);
  field("Hiệu quả (trước / sau)", c.d6.effectiveness);
  section("D7 – Phòng ngừa tái phát");
  actions(c.d7.actions);
  field("Tài liệu cập nhật", (c.d7.documents ?? []).join("; "));
  section("D8 – Ghi nhận & đóng");
  field("Ghi nhận nhóm", c.d8.recognition);
  field("Bài học kinh nghiệm", c.d8.lessons);
  field("Người đóng", c.d8.closedBy);

  return { name: report ? report.code : "8D", rows, merges, widths: [22, 22, 18, 18, 18, 30] };
}

// ===================== BÁO CÁO ĐÃ ĐIỀN SỐ LIỆU =====================

type Period = { from: string; to: string; line?: string };
const periodText = (p: Period) => `Kỳ báo cáo: ${dmy(p.from)} → ${dmy(p.to)} · Line: ${p.line || "Tất cả"}`;
const pctCell = (v: number): Cell => ({ v: Number.isFinite(v) ? v : null, s: "pct" });
const intCell = (v: number): Cell => ({ v: Math.round(v), s: "int" });
const decCell = (v: number): Cell => ({ v, s: "dec" });
const txt = (v: string): Cell => ({ v, s: "text" });

export function oeeWorkbook(report: ReturnType<typeof buildOeeReport>, settings: SmtSettings, period: Period): Sheet[] {
  const t = report.total;
  const target = settings.targets.oee;
  return [
    {
      name: "Tổng hợp OEE",
      widths: [30, 14, 14, 14, 14, 14, 14],
      rows: [
        ...header("OEE & Line Balance Report", settings, [periodText(period)]),
        [H("Chỉ số"), H("Giá trị"), H("Mục tiêu")],
        [{ v: "OEE", s: "bold" }, pctCell(t.oee), pctCell(target)],
        [{ v: "Availability", s: "bold" }, pctCell(t.availability), pctCell(settings.targets.availability)],
        [{ v: "Performance", s: "bold" }, pctCell(t.performance), ""],
        [{ v: "Quality (FPY)", s: "bold" }, pctCell(t.quality), pctCell(settings.targets.fpy)],
        [{ v: "Kế hoạch (phút)", s: "bold" }, intCell(t.planned)],
        [{ v: "Dừng máy (phút)", s: "bold" }, intCell(t.downtime)],
        [{ v: "Tổng sản lượng (board)", s: "bold" }, intCell(t.total)],
        [],
        [S("Theo line"), S(""), S(""), S(""), S("")],
        ["Line", "OEE", "Availability", "Performance", "Quality", "Sản lượng"].map(H),
        ...report.lines.map((l) => [txt(l.name), pctCell(l.oee), pctCell(l.availability), pctCell(l.performance), pctCell(l.quality), intCell(l.total)]),
        [],
        [S("Theo ca"), S(""), S(""), S(""), S("")],
        ["Ca", "OEE", "Availability", "Performance", "Quality", "Sản lượng"].map(H),
        ...report.shifts.map((s) => [txt(s.shift), pctCell(s.oee), pctCell(s.availability), pctCell(s.performance), pctCell(s.quality), intCell(s.total)]),
        [],
        [S("Lý do dừng máy"), S("")],
        ["Lý do", "Phút", "% tổng dừng"].map(H),
        ...report.downtime.map((d) => [txt(d.reason), intCell(d.minutes), pctCell(t.downtime ? d.minutes / t.downtime : 0)])
      ]
    },
    {
      name: "OEE theo ngày",
      widths: [12, 12, 12, 12, 12, 12, 12],
      freezeRows: 1,
      rows: [["Ngày", "OEE", "Availability", "Performance", "Quality", "Sản lượng", "Dừng (phút)"].map(H), ...report.daily.filter((d) => d.has).map((d) => [txt(d.date), pctCell(d.oee), pctCell(d.availability), pctCell(d.performance), pctCell(d.quality), intCell(d.total), intCell(d.downtime)])]
    },
    balanceSheet(report.balance)
  ];
}

function balanceSheet(balance: BalanceResult[]): Sheet {
  const rows: Cell[][] = [[T("Line Balance / Bottleneck")], []];
  for (const b of balance) {
    rows.push([S(`${b.line} · ${b.model} · đo ${dmy(b.measuredOn)}`), S(""), S(""), S("")]);
    rows.push(["Trạm", "CT (s)", "% Takt", "Ghi chú"].map(H));
    for (const s of b.stations) rows.push([txt(s.station), decCell(s.ct), pctCell(b.takt ? s.ct / b.takt : 0), txt(s.station === b.bottleneck.station ? "◀ BOTTLENECK" : s.ct > b.takt ? "Vượt takt" : "")]);
    rows.push([{ v: "Takt (s)", s: "bold" }, decCell(b.takt)]);
    rows.push([{ v: "Line balance efficiency", s: "bold" }, pctCell(b.efficiency)]);
    rows.push([{ v: "UPH tối đa", s: "bold" }, intCell(b.uph)]);
    rows.push([]);
  }
  return { name: "Line Balance", rows, widths: [28, 12, 12, 18] };
}

export function yieldWorkbook(report: ReturnType<typeof buildYieldReport>, settings: SmtSettings, period: Period): Sheet[] {
  return [
    {
      name: "Tổng hợp chất lượng",
      widths: [30, 16, 14, 14, 14],
      rows: [
        ...header("Quality Yield & Defect Pareto Report", settings, [periodText(period)]),
        [H("Chỉ số"), H("Giá trị"), H("Mục tiêu")],
        [{ v: "FPY", s: "bold" }, pctCell(report.fpy), pctCell(settings.targets.fpy)],
        [{ v: "DPMO", s: "bold" }, intCell(report.dpmo), intCell(settings.targets.dpmo)],
        [{ v: "PPM (board)", s: "bold" }, intCell(report.ppm), ""],
        [{ v: "Tổng board", s: "bold" }, intCell(report.boards)],
        [{ v: "Board đạt lần đầu", s: "bold" }, intCell(report.good)],
        [{ v: "Tổng điểm lỗi", s: "bold" }, intCell(report.points)],
        [],
        [S("Theo model (FPY thấp nhất trước)"), S(""), S(""), S(""), S("")],
        ["Model", "Board", "FPY", "DPMO", "Điểm lỗi"].map(H),
        ...report.models.map((m) => [txt(m.model), intCell(m.boards), pctCell(m.fpy), intCell(m.dpmo), intCell(m.defects)])
      ]
    },
    {
      name: "Pareto",
      widths: [10, 32, 10, 10, 14],
      rows: [["Mã", "Tên lỗi", "Số lỗi", "% tổng", "% tích luỹ"].map(H), ...report.pareto.map((p) => [{ v: p.code, s: "bold" as const }, txt(p.vi), intCell(p.qty), pctCell(p.share), pctCell(p.cumulative)])]
    },
    {
      name: "Theo công đoạn & vị trí",
      widths: [26, 12, 4, 14, 14, 10, 10],
      rows: [
        ["Công đoạn", "Số lỗi"].map(H),
        ...report.byProcess.map((p) => [txt(SMT_PROCESSES.find((x) => x.id === p.label)?.vi ?? p.label), intCell(p.qty)]),
        [],
        ["Phát hiện tại", "Số lỗi"].map(H),
        ...report.byDetect.map((p) => [txt(p.label), intCell(p.qty)]),
        [],
        ["Model", "Vị trí", "Mã lỗi", "Số lỗi"].map(H),
        ...report.topLocations.map((l) => [txt(l.model), txt(l.location), txt(l.code), intCell(l.qty)])
      ]
    },
    {
      name: "Theo ngày",
      widths: [12, 12, 10, 10, 10],
      freezeRows: 1,
      rows: [["Ngày", "Board", "FPY", "DPMO", "Điểm lỗi"].map(H), ...report.daily.filter((d) => d.has).map((d) => [txt(d.date), intCell(d.boards), pctCell(d.fpy), intCell(d.dpmo), intCell(d.defects)])]
    }
  ];
}

export function feederWorkbook(health: AssetHealth[], settings: SmtSettings, period: Period): Sheet[] {
  const label = { good: "OK", warning: "Cảnh báo", critical: "Nguy cấp" } as const;
  const style = { good: "good", warning: "warn", critical: "bad" } as const;
  return [
    {
      name: "Feeder & Nozzle Health",
      widths: [9, 12, 10, 16, 12, 10, 12, 13, 10, 11, 40],
      freezeRows: 5,
      landscape: true,
      rows: [
        ...header("Feeder & Nozzle Health / Maintenance Report", settings, [`${periodText(period)} · Mục tiêu mispick ≤ ${(settings.targets.mispickRate * 100).toFixed(2)}%`]),
        ["Loại", "Mã", "Quy cách", "Máy", "Picks", "Mispicks", "Mispick rate", "Hạn PM", "Còn (ngày)", "Trạng thái", "Lý do"].map(H),
        ...health.map((a) => [
          txt(a.asset_type),
          { v: a.code, s: "bold" as const },
          txt(a.spec),
          txt(a.machine),
          intCell(a.picks),
          intCell(a.mispicks),
          pctCell(a.rate),
          txt(dmy(a.nextPm)),
          a.daysToPm === null ? txt("") : intCell(a.daysToPm),
          { v: label[a.health], s: style[a.health] },
          txt(a.reasons.join("; "))
        ])
      ]
    }
  ];
}

export function changeWorkbook(data: ReturnType<typeof buildChangeMatrix>, settings: SmtSettings, period: Period): Sheet[] {
  const cat = (id: string) => CHANGE_CATEGORIES.find((c) => c.id === id);
  return [
    {
      name: "Ma trận 4M1E",
      widths: [26, 8, 10, 12, 12, 9, 11, 13, 6],
      rows: [
        ...header("4M1E Change Management Matrix", settings, [periodText(period)]),
        ["Hạng mục", "Tổng", "Kế hoạch", "Đã áp dụng", "Đã xác nhận", "Từ chối", "Rủi ro cao", "Chờ xác nhận", "NG"].map(H),
        ...data.matrix.map((m) => [{ v: `${m.short} – ${m.vi}`, s: "bold" as const }, intCell(m.total), intCell(m.planned), intCell(m.implemented), intCell(m.verified), intCell(m.rejected), intCell(m.high), intCell(m.pendingValidation), intCell(m.ng)])
      ]
    },
    {
      name: "Danh sách thay đổi",
      widths: [12, 11, 14, 6, 12, 30, 22, 22, 22, 9, 30, 9, 12],
      freezeRows: 1,
      landscape: true,
      rows: [
        ["Mã", "Ngày", "Hạng mục", "Line", "Model", "Nội dung", "Trước", "Sau", "Lý do", "Rủi ro", "Xác nhận", "Kết quả", "Trạng thái"].map(H),
        ...data.rows.map((r) => [txt(r.code), txt(r.change_date), txt(cat(r.category)?.short ?? r.category), txt(r.line), txt(r.model), txt(r.item), txt(r.before_state), txt(r.after_state), txt(r.reason), txt(r.risk), txt(r.validation), txt(r.result), txt(r.status)])
      ]
    }
  ];
}

// ===================== BỘ DỮ LIỆU (nhập / xuất thô) =====================

// Mẫu nhập liệu cho 1 dataset: dòng 1 = tên cột (khớp key), dòng 2 = nhãn tiếng Việt.
export function datasetSheet(key: DatasetKey, rows: Array<Record<string, unknown>> = []): Sheet {
  const def = DATASETS[key];
  const fields = def.fields.filter((f) => f.type !== "json");
  return {
    name: def.label,
    freezeRows: 2,
    widths: fields.map((f) => (f.type === "textarea" ? 34 : f.type === "date" ? 12 : Math.max(10, Math.min(28, f.label.length + 2)))),
    validations: fields.flatMap((f, i) => (f.options ? [{ range: `${colName(i)}3:${colName(i)}1000`, list: f.options.map((o) => o.value) }] : [])),
    rows: [
      fields.map((f) => H(f.key)),
      fields.map((f) => N(f.label + (f.required ? " *" : ""))),
      ...rows.map((row) => fields.map((f): Cell => {
        const v = row[f.key];
        if (typeof v === "number") return f.type === "int" ? intCell(v) : decCell(v);
        if (typeof v === "boolean") return txt(v ? "x" : "");
        return txt(v === null || v === undefined ? "" : String(v));
      }))
    ]
  };
}
