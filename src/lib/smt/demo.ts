import { DEFAULT_SMT_SETTINGS } from "@/lib/smt/defaults";
import { addDays, emptyEightDContent, todayVn } from "@/lib/smt/types";
import type { Asset, AssetLog, ChangeLog, CycleTime, DefectLog, EightDReport, ProductionLog, SmtDataBundle } from "@/lib/smt/types";

// Dữ liệu DEMO cho trang công khai (và nút "Xem bằng dữ liệu demo" trong Admin).
// Sinh bằng số ngẫu nhiên có seed cố định -> cùng một ngày luôn ra cùng số liệu (không nhảy khi F5).
// Số liệu mô phỏng 2 line SMT điển hình, KHÔNG phải dữ liệu nhà máy thật.

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const MODELS: Record<string, Array<{ model: string; ct: number; opp: number }>> = {
  L1: [
    { model: "MB-A100", ct: 30, opp: 1240 },
    { model: "PWR-220", ct: 26, opp: 680 }
  ],
  L2: [
    { model: "CTRL-X5", ct: 38, opp: 960 },
    { model: "LED-D12", ct: 22, opp: 420 }
  ]
};

const DOWNTIME_REASONS: Array<[string, number]> = [
  ["Đổi model (changeover)", 32],
  ["Chờ vật tư", 18],
  ["Lỗi máy Mounter", 16],
  ["Lỗi feeder / hết cuộn", 14],
  ["Lau stencil / chỉnh Printer", 10],
  ["Chờ kỹ thuật", 6],
  ["Lỗi băng tải", 4]
];

// Phân bố lỗi dạng Pareto điển hình của SMT (chập thiếc, thiếu thiếc chiếm phần lớn).
const DEFECT_WEIGHTS: Array<[string, number]> = [
  ["BRG", 30],
  ["INS", 19],
  ["SHF", 13],
  ["TMB", 10],
  ["MIS", 7],
  ["SBL", 6],
  ["POL", 4],
  ["OPN", 4],
  ["WRG", 2],
  ["LFT", 2],
  ["DMG", 1.5],
  ["CON", 1.5]
];

const LOCATIONS: Record<string, string[]> = {
  BRG: ["U5", "U5", "U12", "J3", "U2"],
  INS: ["C14", "R33", "U5", "Q2"],
  SHF: ["C102", "R7", "L3", "D4"],
  TMB: ["C45", "R18", "C46"],
  MIS: ["C8", "R2", "C9"],
  SBL: ["U1", "C20"],
  POL: ["D1", "D2", "C77"],
  OPN: ["U7", "J1"],
  WRG: ["R12"],
  LFT: ["U9"],
  DMG: ["C3"],
  CON: ["PCB"]
};

function pickWeighted<T>(items: Array<[T, number]>, r: number): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r * total;
  for (const [item, w] of items) {
    x -= w;
    if (x <= 0) return item;
  }
  return items[items.length - 1][0];
}

export function buildDemoBundle(days = 30, endDate = todayVn()): SmtDataBundle {
  const settings = DEFAULT_SMT_SETTINGS;
  const processOf = (code: string) => settings.defectCatalog.find((d) => d.code === code)?.process ?? "other";
  const production: ProductionLog[] = [];
  const defects: DefectLog[] = [];
  let seq = 0;
  const id = (prefix: string) => `demo-${prefix}-${++seq}`;

  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(endDate, -i);
    for (const line of settings.lines) {
      settings.shifts.forEach((shift, si) => {
        const r = rng(`${date}|${line.code}|${shift}`);
        // Ca 3 nghỉ Chủ nhật
        if (si === 2 && new Date(`${date}T00:00:00Z`).getUTCDay() === 0) return;
        const m = MODELS[line.code][r() < 0.62 ? 0 : 1];
        const planned = 450;
        const downtime = Math.round(12 + r() * 48 + (r() < 0.1 ? 40 : 0));
        const perf = 0.86 + r() * 0.11;
        const total = Math.floor((((planned - downtime) * 60) / m.ct) * perf);
        const fpy = 0.972 + r() * 0.024 - (line.code === "L2" ? 0.004 : 0);
        const good = Math.round(total * fpy);
        production.push({
          id: id("p"),
          log_date: date,
          shift,
          line: line.code,
          model: m.model,
          work_order: `WO${date.replace(/-/g, "").slice(2)}${line.code}${si + 1}`,
          planned_min: planned,
          downtime_min: downtime,
          downtime_reason: pickWeighted(DOWNTIME_REASONS, r()),
          ideal_ct_sec: m.ct,
          total_qty: total,
          good_qty: good,
          opportunities: m.opp,
          note: ""
        });

        // Gộp lỗi theo mã cho mỗi ca (1 board lỗi ≈ 1.15 điểm lỗi).
        const points = Math.round((total - good) * (1.05 + r() * 0.2));
        const byCode = new Map<string, number>();
        for (let k = 0; k < points; k++) {
          const code = pickWeighted(DEFECT_WEIGHTS, r());
          byCode.set(code, (byCode.get(code) ?? 0) + 1);
        }
        for (const [code, qty] of byCode) {
          const locs = LOCATIONS[code] ?? ["-"];
          const process = processOf(code);
          const location = locs[Math.floor(r() * locs.length)];
          const detected = process === "print" && r() < 0.35 ? "SPI" : r() < 0.06 ? "ICT" : "AOI";
          // Gộp các ca cùng ngày / line / model / mã lỗi / vị trí thành 1 dòng cho gọn dữ liệu.
          const same = defects.find((d) => d.log_date === date && d.line === line.code && d.model === m.model && d.defect_code === code && d.location === location && d.detected_by === detected);
          if (same) {
            same.qty += qty;
            continue;
          }
          defects.push({
            id: id("d"),
            log_date: date,
            shift: "",
            line: line.code,
            model: m.model,
            defect_code: code,
            process,
            detected_by: detected,
            location,
            part_no: "",
            qty,
            root_cause: "",
            action: ""
          });
        }
      });
    }
  }

  const cycleTimes: CycleTime[] = [];
  const ctProfile: Record<string, number[]> = {
    "MB-A100": [24, 18, 27.5, 29.8, 21.5, 26, 23],
    "PWR-220": [22, 17, 19.5, 24.6, 15, 26, 20],
    "CTRL-X5": [28, 22, 33.5, 31, 37.2, 30, 29],
    "LED-D12": [20, 15, 18.5, 21.4, 12, 22, 19]
  };
  for (const line of settings.lines) {
    for (const { model } of MODELS[line.code]) {
      line.stations.forEach((station, idx) => {
        cycleTimes.push({ id: id("ct"), measured_on: addDays(endDate, -3), line: line.code, model, station, cycle_time_sec: ctProfile[model][idx] ?? 20, note: "" });
      });
    }
  }

  const changes: ChangeLog[] = [
    change(addDays(endDate, -26), "material", "L1", "MB-A100", "Đổi lot kem hàn SAC305 (cùng hãng, lot mới)", "Lot 2405-A", "Lot 2409-C", "Lot cũ hết hạn sử dụng", "low", "SPI 3 board đầu: Volume 85-115%, Cpk ≥ 1.33", "ok", "verified"),
    change(addDays(endDate, -21), "machine", "L1", "", "Thay đầu hút (head) Mounter 2 sau bảo dưỡng", "Head H08 (rung)", "Head H08 mới hiệu chuẩn", "Mispick tăng 0.6%", "medium", "Kiểm tra lệch XY trên board kính, chạy 50 board theo dõi mispick", "ok", "verified"),
    change(addDays(endDate, -17), "method", "L2", "CTRL-X5", "Chỉnh profile lò Reflow: tăng soak 10s", "Soak 60s @ 150-180°C", "Soak 70s @ 150-180°C", "Giảm rỗ khí BGA (void > 25%)", "medium", "Đo profile bằng KIC, X-ray 5 board BGA", "ok", "verified"),
    change(addDays(endDate, -12), "man", "L2", "", "Operator mới vận hành Printer ca 3", "Nguyễn V. A (đã chuyển bộ phận)", "Trần T. B (đã đào tạo OJT 2 tuần)", "Luân chuyển nhân sự", "medium", "Kiểm tra kỹ năng theo checklist, giám sát 3 ca đầu", "ok", "verified"),
    change(addDays(endDate, -8), "material", "L1", "PWR-220", "Linh kiện thay thế (2nd source) tụ C45", "Murata GRM21", "Samsung CL21 (đã duyệt AVL)", "Thiếu hàng nhà cung cấp chính", "high", "FAI 5 board, kiểm tra footprint, đo điện dung, AOI 100% lô đầu", "ok", "implemented"),
    change(addDays(endDate, -5), "environment", "L1", "", "Điều chỉnh độ ẩm phòng SMT", "35-65% RH", "40-60% RH", "Giảm tĩnh điện & hút ẩm linh kiện MSL", "low", "Theo dõi data logger 7 ngày", "pending", "implemented"),
    change(addDays(endDate, -2), "method", "L2", "LED-D12", "Đổi stencil 0.12mm → 0.10mm cho LED", "Stencil 0.12mm", "Stencil 0.10mm step-down", "Chập thiếc chân LED", "high", "SPI 10 board + AOI, so sánh tỉ lệ BRG trước/sau", "pending", "planned")
  ];

  const assets: Asset[] = [];
  const assetLogs: AssetLog[] = [];
  const feederSpecs = ["8mm", "8mm", "8mm", "12mm", "16mm", "24mm"];
  const nozzleSpecs = ["1001", "1002", "1003", "1004", "CN040", "CN065"];
  const makeAsset = (type: Asset["asset_type"], code: string, spec: string, machine: string, r: () => number): Asset => {
    const interval = type === "feeder" ? 90 : 30;
    const age = Math.floor(r() * interval * 1.25);
    return { id: id("a"), asset_type: type, code, spec, machine, status: r() < 0.05 ? "maintenance" : "active", last_pm_on: addDays(endDate, -age), pm_interval_days: interval, note: "" };
  };
  for (let i = 1; i <= 24; i++) {
    const r = rng(`feeder-${i}`);
    assets.push(makeAsset("feeder", `FD-${String(i).padStart(3, "0")}`, feederSpecs[i % feederSpecs.length], i <= 12 ? "L1-Mounter 1" : "L2-NXT M3 #1", r));
  }
  for (let i = 1; i <= 12; i++) {
    const r = rng(`nozzle-${i}`);
    assets.push(makeAsset("nozzle", `NZ-${String(i).padStart(3, "0")}`, nozzleSpecs[i % nozzleSpecs.length], i <= 6 ? "L1-Mounter 2" : "L2-NXT M6", r));
  }
  // 3 feeder + 1 nozzle "có vấn đề" để báo cáo có điểm đáng chú ý.
  const bad = new Set(["FD-007", "FD-015", "FD-021", "NZ-004"]);
  for (const a of assets) {
    for (let w = 0; w < Math.ceil(days / 7); w++) {
      const date = addDays(endDate, -w * 7);
      const r = rng(`${a.code}|${date}`);
      const picks = Math.round((a.asset_type === "feeder" ? 9000 : 26000) * (0.7 + r() * 0.6));
      const rate = bad.has(a.code) ? 0.006 + r() * 0.01 : 0.0004 + r() * 0.0022;
      assetLogs.push({ id: id("al"), asset_id: a.id, log_date: date, event: "usage", picks, mispicks: Math.round(picks * rate), result: "ok", technician: "", note: "" });
    }
    if (a.last_pm_on) assetLogs.push({ id: id("al"), asset_id: a.id, log_date: a.last_pm_on, event: "pm", picks: 0, mispicks: 0, result: "ok", technician: "KTV ca 1", note: "Vệ sinh, tra dầu, kiểm tra lò xo / pitch" });
  }

  return { production, defects, cycleTimes, changes, assets, assetLogs, eightD: [demoEightD(endDate)] };

  function change(
    date: string,
    category: ChangeLog["category"],
    line: string,
    model: string,
    item: string,
    before: string,
    after: string,
    reason: string,
    risk: ChangeLog["risk"],
    validation: string,
    result: ChangeLog["result"],
    status: ChangeLog["status"]
  ): ChangeLog {
    return {
      id: id("c"),
      code: `4M-${date.slice(2, 4)}${date.slice(5, 7)}-${String(seq).padStart(2, "0")}`,
      change_date: date,
      category,
      line,
      model,
      item,
      before_state: before,
      after_state: after,
      reason,
      risk,
      validation,
      result,
      status,
      owner: "SMT PE",
      approved_by: "QA Manager",
      is_public: true,
      note: ""
    };
  }
}

// Một case 8D hoàn chỉnh làm ví dụ: chập thiếc chân IC QFN.
export function demoEightD(endDate = todayVn()): EightDReport {
  const opened = addDays(endDate, -24);
  const c = emptyEightDContent();
  c.d0 = {
    symptom: "Khách hàng báo 6/1.200 board MB-A100 lỗi chức năng, phân tích lại thấy chập thiếc giữa chân 14-15 của IC QFN U5.",
    emergencyAction: "Dừng giao lô WO240913; tăng kiểm tra X-ray/AOI 100% vị trí U5 cho các lô còn tồn.",
    need8d: "Có – lỗi đến tay khách hàng, ảnh hưởng chức năng, cần phân tích gốc rễ."
  };
  c.d1.team = [
    { name: "Mr Jay", role: "Trưởng nhóm (SMT PE)", dept: "Kỹ thuật SMT" },
    { name: "QA Engineer", role: "Chất lượng / làm việc với khách", dept: "QA" },
    { name: "Process Tech", role: "Printer & Reflow", dept: "Sản xuất" },
    { name: "AOI Programmer", role: "Chương trình AOI", dept: "Kỹ thuật" }
  ];
  c.d2 = {
    what: "Chập thiếc (bridge) chân 14-15 IC QFN-32 U5",
    where: "Line 1, model MB-A100, phát hiện tại khách hàng (FCT)",
    when: `Lô sản xuất ${addDays(opened, -6)} → ${addDays(opened, -3)}`,
    who: "Khách hàng phát hiện; ca 2 & ca 3 sản xuất",
    why: "Kem hàn thừa ở pad pitch 0.5mm do stencil mòn, AOI không bắt được do ngưỡng rộng",
    how: "Chập 2 chân liền kề, chỉ thấy rõ khi nghiêng góc / X-ray",
    howMany: "6 board lỗi / 1.200 giao (5.000 PPM); 18 board lỗi thêm trong 3.400 board tồn kho",
    statement: "Board MB-A100 sản xuất trên Line 1 bị chập thiếc chân 14-15 của U5 với tỉ lệ ~5.000 PPM, lọt qua AOI và đến tay khách hàng."
  };
  c.d3 = {
    actions: [
      { action: "Cách ly 3.400 board tồn kho & 2 lô WIP, kiểm tra X-ray 100% U5", owner: "QA", due: addDays(opened, 1), status: "done", result: "18 board NG đã rework, 3.382 board OK" },
      { action: "Gửi thay thế 6 board cho khách, sort tại kho khách 1.194 board", owner: "QA", due: addDays(opened, 2), status: "done", result: "Không thấy thêm lỗi" },
      { action: "Siết ngưỡng AOI vị trí U5 (bridge) tạm thời", owner: "AOI Programmer", due: addDays(opened, 1), status: "done", result: "Bắt được 100% mẫu lỗi" }
    ],
    stockCheck: "Kho thành phẩm: 3.400 · WIP: 2 lô · Đang vận chuyển: 0 · Tại khách: 1.200"
  };
  c.d4 = {
    fishbone: {
      man: ["Lau stencil không đúng tần suất ca 3"],
      machine: ["Stencil đã dùng 85.000 lần in, mép aperture mòn", "Áp lực dao gạt lệch 0.5kg so với chuẩn"],
      material: ["Kem hàn mở nắp > 8 giờ trên stencil"],
      method: ["Aperture U5 thiết kế 1:1, chưa giảm diện tích cho pitch 0.5mm"],
      measurement: ["Ngưỡng AOI bridge cho QFN đặt quá rộng (mất phát hiện)", "SPI chưa bật kiểm tra bridge 2D"],
      environment: ["Độ ẩm phòng 63% (gần giới hạn trên)"]
    },
    whyOccur: [
      "Vì sao chập thiếc? → Lượng kem hàn trên pad chân 14-15 vượt 135%.",
      "Vì sao kem thừa? → Kem tràn ra ngoài pad do aperture stencil bị mòn mép.",
      "Vì sao aperture mòn? → Stencil đã dùng 85.000 lần in, vượt tuổi thọ khuyến nghị 60.000.",
      "Vì sao vẫn dùng? → Không có hệ thống theo dõi số lần in của stencil.",
      "Vì sao chưa có? → Quy trình quản lý stencil chỉ kiểm tra lực căng, không có giới hạn tuổi thọ."
    ],
    whyEscape: [
      "Vì sao lọt? → AOI không báo lỗi bridge tại U5.",
      "Vì sao AOI không báo? → Ngưỡng diện tích bridge đặt 40%, lỗi thực tế chỉ 25%.",
      "Vì sao ngưỡng rộng? → Được nới ra để giảm báo giả (false call) khi ra model.",
      "Vì sao nới không xác nhận lại? → Không có bước duyệt thay đổi chương trình AOI.",
      "Vì sao không có bước duyệt? → Thay đổi chương trình AOI chưa nằm trong quản lý 4M."
    ],
    rootOccur: "Không có giới hạn tuổi thọ (số lần in) cho stencil → aperture mòn gây kem thừa trên pad pitch 0.5mm.",
    rootEscape: "Chương trình AOI được nới ngưỡng mà không qua quy trình duyệt thay đổi (ngoài phạm vi 4M).",
    verification: "Tái hiện: in 20 board bằng stencil cũ → 3 board bridge; stencil mới → 0/20. AOI ngưỡng 20% bắt được 6/6 mẫu lỗi."
  };
  c.d5 = {
    actions: [
      { action: "Thay stencil mới, aperture U5 giảm 10% (home-plate)", owner: "Process Tech", due: addDays(opened, 5), status: "done", result: "SPI volume U5: 92-108%" },
      { action: "Đặt ngưỡng AOI bridge QFN = 20%, khoá chỉnh sửa bằng mật khẩu", owner: "AOI Programmer", due: addDays(opened, 4), status: "done", result: "False call tăng 0.3%, chấp nhận" }
    ]
  };
  c.d6 = {
    actions: [
      { action: "Chạy 5.000 board theo dõi lỗi bridge U5", owner: "SMT PE", due: addDays(opened, 14), status: "done", result: "0 lỗi / 5.000 board" },
      { action: "SPI bật kiểm tra bridge 2D cho QFN", owner: "Process Tech", due: addDays(opened, 7), status: "done", result: "Hoạt động" }
    ],
    effectiveness: "Trước: 5.000 PPM → Sau: 0 PPM trong 4 tuần theo dõi (≈ 21.000 board)."
  };
  c.d7 = {
    actions: [
      { action: "Thêm đếm số lần in vào phiếu quản lý stencil, giới hạn 60.000 lần", owner: "SMT PE", due: addDays(opened, 10), status: "done", result: "Áp dụng cho toàn bộ stencil" },
      { action: "Đưa thay đổi chương trình AOI/SPI vào quy trình 4M (Method)", owner: "QA", due: addDays(opened, 12), status: "done", result: "Cập nhật QP-SMT-012" },
      { action: "Áp dụng ngang (yokoten) cho các model có QFN pitch ≤ 0.5mm", owner: "SMT PE", due: addDays(opened, 15), status: "done", result: "7 model đã rà soát" }
    ],
    documents: ["PFMEA SMT – cập nhật mục Printing", "Control Plan MB-A100 rev.C", "WI-PRT-003 Quản lý stencil", "QP-SMT-012 Quản lý thay đổi 4M"]
  };
  c.d8 = {
    recognition: "Ghi nhận nhóm 8D hoàn thành trước hạn 3 ngày, khách hàng chấp nhận báo cáo.",
    lessons: "Thiết bị tiêu hao (stencil, nozzle, dao gạt) cần quản lý theo tuổi thọ; mọi thay đổi chương trình kiểm tra là thay đổi 4M.",
    closedBy: "QA Manager"
  };
  return {
    id: "demo-8d-1",
    code: `8D-${opened.slice(2, 4)}${opened.slice(5, 7)}-01`,
    title: "Chập thiếc chân IC QFN U5 – MB-A100 (khách hàng phàn nàn)",
    status: "closed",
    severity: "critical",
    customer: "Khách hàng A (ẩn danh)",
    line: "L1",
    model: "MB-A100",
    defect_code: "BRG",
    owner: "Mr Jay",
    opened_on: opened,
    due_on: addDays(opened, 30),
    closed_on: addDays(opened, 21),
    content: c,
    is_public: true
  };
}
