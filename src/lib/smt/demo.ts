import { DEMO_LINES, DEMO_SMT_SETTINGS, type DemoLine, type LineTier } from "@/lib/smt/demo-config";
import { addDays, daysBetween, emptyEightDContent, todayVn } from "@/lib/smt/types";
import type { Asset, AssetLog, ChangeLog, CycleTime, DefectLog, EightDContent, EightDReport, ProductionLog, SmtDataBundle } from "@/lib/smt/types";

// Dữ liệu DEMO của nhà máy mô phỏng 10 line (xem demo-config.ts). KHÔNG phải dữ liệu thật.
//
// Nguyên tắc:
//  - Số ngẫu nhiên có seed cố định theo (ngày, line, ca) -> sinh lại bao nhiêu lần cũng ra cùng số liệu,
//    nên bản lưu trong database (Admin → SMT → Dữ liệu demo) và bản tính tạm trong bộ nhớ luôn khớp nhau.
//  - Kỳ demo bắt đầu từ ngày đầu quý cách đây 2 quý (vd hôm nay ở Q4 -> từ 01/04) đến hôm nay.
//  - Có các "sự kiện" (lô kem hàn lỗi, hỏng đầu hút, NPI, khách hàng phàn nàn...) gắn với 8D, 4M và
//    công việc của kỹ sư, để số liệu có câu chuyện thật sự khi phân tích.

export type DemoWindow = { from: string; to: string };

type NoId<T> = Omit<T, "id">;

// ---------- Số ngẫu nhiên có seed ----------
export function rng(seed: string) {
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

// UUID cố định theo seed: bản ghi tham chiếu nhau (log ↔ thiết bị, việc ↔ kỹ sư) mà không cần đọc lại DB.
export function demoUuid(seed: string) {
  const r = rng(`uuid|${seed}`);
  const hex = Array.from({ length: 32 }, () => Math.floor(r() * 16).toString(16));
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

export function pickWeighted<T>(items: Array<[T, number]>, r: number): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r * total;
  for (const [item, w] of items) {
    x -= w;
    if (x <= 0) return item;
  }
  return items[items.length - 1][0];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---------- Kỳ demo ----------
export function quarterStart(iso: string, back = 0) {
  const y = Number(iso.slice(0, 4));
  const q = Math.floor((Number(iso.slice(5, 7)) - 1) / 3) - back;
  const yy = y + Math.floor(q / 4);
  const qq = ((q % 4) + 4) % 4;
  return `${yy}-${String(qq * 3 + 1).padStart(2, "0")}-01`;
}

export function demoWindow(today = todayVn()): DemoWindow {
  return { from: quarterStart(today, 2), to: today };
}

// Nghỉ lễ cả nhà máy (dương lịch).
const HOLIDAYS = ["01-01", "04-30", "05-01", "09-01", "09-02"];

// ---------- Sự kiện ----------
// Vị trí tính theo số ngày kể từ đầu kỳ demo (hoặc tính lùi từ cuối kỳ với "fromEnd").
type EventId = "paste" | "head" | "npi" | "escape" | "highmix" | "polarity";

export type DemoEvent = {
  id: EventId;
  line: string;
  model?: string;
  start: number;
  days: number;
  fromEnd?: boolean;
  title: { vi: string; en: string };
};

export const DEMO_EVENTS: DemoEvent[] = [
  { id: "paste", line: "L02", start: 47, days: 12, title: { vi: "Lô kem hàn mới bị khô sớm → thiếu thiếc", en: "New solder paste lot dries early → insufficient solder" } },
  { id: "head", line: "L05", start: 96, days: 12, title: { vi: "Hỏng servo đầu hút Mounter 3 → dừng máy & mispick", en: "Mounter 3 head servo failure → downtime & mispicks" } },
  { id: "npi", line: "L08", model: "ECU-A9", start: 131, days: 19, title: { vi: "NPI ECU-A9 rev C: rỗ khí BGA (void)", en: "NPI ECU-A9 rev C: BGA voiding" } },
  { id: "escape", line: "L01", model: "PSU-65W", start: 166, days: 7, title: { vi: "Chập thiếc QFN U5 lọt đến khách hàng", en: "QFN U5 bridge escaped to customer" } },
  { id: "highmix", line: "L09", start: 21, days: 21, fromEnd: true, title: { vi: "Đơn hàng high-mix: đổi model liên tục", en: "High-mix orders: frequent changeovers" } },
  { id: "polarity", line: "L06", model: "INV-2K", start: 9, days: 9, fromEnd: true, title: { vi: "Ngược cực diode D7 sau khi đổi nhà cung cấp cuộn", en: "Diode D7 reversed after reel supplier change" } }
];

export function eventRange(ev: DemoEvent, win: DemoWindow) {
  const from = ev.fromEnd ? addDays(win.to, -ev.start) : addDays(win.from, ev.start);
  const to = addDays(from, ev.days - 1);
  return { from, to: to > win.to ? win.to : to };
}

function activeEvent(win: DemoWindow, date: string, line: string) {
  for (const ev of DEMO_EVENTS) {
    if (ev.line !== line) continue;
    const r = eventRange(ev, win);
    if (date >= r.from && date <= r.to) return { ev, day: daysBetween(r.from, date), len: daysBetween(r.from, r.to) + 1 };
  }
  return null;
}

// ---------- Thông số theo cấp line ----------
const TIER: Record<LineTier, { fpy: number; perf: [number, number]; baseDown: [number, number]; changeover: [number, number]; coProb: number; idle: number }> = {
  basic: { fpy: 0.967, perf: [0.84, 0.08], baseDown: [22, 30], changeover: [28, 10], coProb: 0.35, idle: 0.03 },
  maoi: { fpy: 0.979, perf: [0.87, 0.07], baseDown: [16, 24], changeover: [22, 8], coProb: 0.3, idle: 0.015 },
  pro: { fpy: 0.988, perf: [0.9, 0.06], baseDown: [10, 18], changeover: [14, 5], coProb: 0.25, idle: 0.01 }
};

const DOWNTIME_REASONS: Record<LineTier, Array<[string, number]>> = {
  basic: [["Chờ vật tư", 22], ["Lỗi feeder / hết cuộn", 20], ["Lỗi máy Mounter", 16], ["Lau stencil / chỉnh Printer", 16], ["Chờ kỹ thuật", 12], ["Lỗi băng tải", 8], ["Chờ QC duyệt FAI", 6]],
  maoi: [["Lỗi feeder / hết cuộn", 22], ["Chờ vật tư", 18], ["Lỗi máy Mounter", 16], ["M-AOI báo lỗi hàng loạt", 12], ["Lau stencil / chỉnh Printer", 12], ["Chờ kỹ thuật", 10], ["Chờ QC duyệt FAI", 10]],
  pro: [["Lỗi feeder / hết cuộn", 20], ["Chờ vật tư", 16], ["AXI kiểm tra lại (re-shoot)", 14], ["Lỗi máy Mounter", 14], ["Chờ QC duyệt FAI", 14], ["Hiệu chỉnh profile lò", 10], ["Chờ kỹ thuật", 12]]
};

// Phân bố lỗi kiểu Pareto. Line có M-AOI sửa máy sớm nên lỗi gắn linh kiện ít hơn; SPI 3D closed-loop giảm lỗi in.
const DEFECT_WEIGHTS: Record<LineTier, Array<[string, number]>> = {
  basic: [["BRG", 26], ["INS", 20], ["SHF", 13], ["TMB", 10], ["MIS", 8], ["SBL", 6], ["POL", 4], ["OPN", 4], ["BIL", 3], ["WRG", 2], ["LFT", 2], ["DMG", 1], ["CON", 1]],
  maoi: [["BRG", 27], ["INS", 21], ["SHF", 8], ["TMB", 11], ["MIS", 5], ["SBL", 7], ["POL", 2.5], ["OPN", 5], ["BIL", 2], ["WRG", 1.5], ["LFT", 2.5], ["DMG", 1], ["CON", 1.5]],
  pro: [["BRG", 18], ["INS", 15], ["SHF", 7], ["TMB", 9], ["MIS", 4], ["SBL", 8], ["VOD", 16], ["POL", 2], ["OPN", 7], ["BIL", 1.5], ["WRG", 1], ["LFT", 3], ["DMG", 1], ["CON", 1.5]]
};

const LOCATIONS: Record<string, string[]> = {
  BRG: ["U5", "U5", "U12", "J3", "U2"],
  INS: ["C14", "R33", "U5", "Q2"],
  EXS: ["J1", "U3"],
  SHF: ["C102", "R7", "L3", "D4"],
  TMB: ["C45", "R18", "C46"],
  MIS: ["C8", "R2", "C9"],
  SBL: ["U1", "C20"],
  VOD: ["U1", "U1", "U4"],
  POL: ["D1", "D2", "D7"],
  BIL: ["R40", "C51"],
  OPN: ["U7", "J1"],
  WRG: ["R12"],
  LFT: ["U9"],
  DMG: ["C3"],
  CON: ["PCB"]
};

const PROCESS_OF: Record<string, DefectLog["process"]> = Object.fromEntries(DEMO_SMT_SETTINGS.defectCatalog.map((d) => [d.code, d.process]));

// Trạm phát hiện: lỗi in -> SPI; lỗi gắn -> M-AOI (nếu có); void BGA -> AXI (line Pro);
// phần còn lại AOI cuối line. Một phần nhỏ lọt xuống ICT/FCT và hiếm hơn nữa là đến khách hàng.
const ESCAPE: Record<LineTier, { spi: number; test: number; customer: number }> = {
  basic: { spi: 0.35, test: 0.07, customer: 0.004 },
  maoi: { spi: 0.4, test: 0.04, customer: 0.002 },
  pro: { spi: 0.55, test: 0.015, customer: 0.0005 }
};

function detectPoint(code: string, tier: LineTier, r: () => number, customerBoost = 1): string {
  const e = ESCAPE[tier];
  const process = PROCESS_OF[code] ?? "other";
  if (process === "manual") return r() < 0.7 ? "Visual" : "AOI";
  if (process === "print" && r() < e.spi) return "SPI";
  if ((process === "placement" || process === "material") && tier !== "basic" && r() < 0.78) return "M-AOI";
  if (code === "VOD") return tier === "pro" && r() < 0.92 ? "AXI" : "FCT";
  if (tier === "pro" && code === "BRG" && r() < 0.08) return "AXI";
  const x = r();
  if (x < e.customer * customerBoost) return "Customer";
  if (x < e.customer * customerBoost + e.test) return r() < 0.5 ? "ICT" : "FCT";
  return "AOI";
}

function isOff(date: string) {
  return HOLIDAYS.includes(date.slice(5));
}

const isSunday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
const quarterIndex = (win: DemoWindow, date: string) => Math.floor(daysBetween(win.from, date) / 91);

// Cải tiến cân bằng line L05 (việc của kỹ sư) -> từ ngày này CT chuẩn MCU-M7 giảm 36 → 33s.
export const BALANCE_DAY = 118;
function modelCt(line: DemoLine, m: DemoLine["models"][number], win: DemoWindow, date: string) {
  if (line.code === "L05" && m.model === "MCU-M7" && date >= addDays(win.from, BALANCE_DAY)) return 33;
  return m.ct;
}

// ---------- Nhật ký sản xuất + lỗi theo ngày ----------
export function demoDays(win: DemoWindow, from = win.from, to = win.to) {
  const production: Array<NoId<ProductionLog>> = [];
  const defects: Array<NoId<DefectLog>> = [];
  const start = from < win.from ? win.from : from;
  const end = to > win.to ? win.to : to;
  const shiftNames = DEMO_SMT_SETTINGS.shifts;

  for (let date = start; date <= end; date = addDays(date, 1)) {
    if (isOff(date)) continue;
    const q = quarterIndex(win, date);
    for (const line of DEMO_LINES) {
      const tier = TIER[line.tier];
      const ev = activeEvent(win, date, line.code);
      // Gộp lỗi trong ngày theo model / mã lỗi / trạm phát hiện để dữ liệu gọn.
      const dayDefects = new Map<string, NoId<DefectLog>>();
      for (let si = 0; si < line.shifts; si++) {
        const shift = shiftNames[si];
        // Chủ nhật: chỉ chạy ca 1 (line 2 ca) hoặc nghỉ ca 3 (line 3 ca).
        if (isSunday(date) && (line.shifts === 2 ? si > 0 : si === 2)) continue;
        const r = rng(`${date}|${line.code}|${si}`);
        if (r() < tier.idle) continue; // không có đơn hàng
        const m = pickWeighted(line.models.map((x) => [x, x.share] as [typeof x, number]), r());
        const ct = modelCt(line, m, win, date);
        const planned = 450;

        // Dừng máy = đổi model + dừng vặt + sự cố (hiếm).
        let coProb = tier.coProb;
        if (ev?.ev.id === "highmix") coProb = 0.95;
        const changeover = r() < coProb ? Math.round(tier.changeover[0] + (r() - 0.5) * tier.changeover[1]) : 0;
        let other = tier.baseDown[0] + r() * tier.baseDown[1] - q * 3;
        let reason = pickWeighted(DOWNTIME_REASONS[line.tier], r());
        if (r() < 0.06) other += 30 + r() * 60;
        if (ev?.ev.id === "head" && ev.day < 4) {
          other += 80 + r() * 60;
          reason = "Lỗi máy Mounter";
        }
        if (ev?.ev.id === "npi" && ev.day < 3) {
          other += 40;
          reason = "Chờ QC duyệt FAI";
        }
        const downtime = Math.round(clamp(changeover + other, 0, planned - 60));
        if (changeover > other) reason = "Đổi model (changeover)";

        const perf = tier.perf[0] + r() * tier.perf[1];
        const total = Math.floor((((planned - downtime) * 60) / ct) * perf);
        let fpy = tier.fpy + q * 0.0025 + (r() - 0.5) * 0.008;
        if (ev?.ev.id === "paste") fpy -= 0.028;
        if (ev?.ev.id === "head") fpy -= 0.012;
        if (ev?.ev.id === "npi" && m.model === ev.ev.model) fpy -= 0.03 * (1 - ev.day / ev.len);
        if (ev?.ev.id === "escape" && m.model === ev.ev.model) fpy -= 0.015;
        if (ev?.ev.id === "polarity" && m.model === ev.ev.model) fpy -= 0.01;
        fpy = clamp(fpy, 0.85, 0.998);
        const good = Math.round(total * fpy);

        production.push({
          log_date: date,
          shift,
          line: line.code,
          model: m.model,
          work_order: `WO${date.replace(/-/g, "").slice(2)}-${line.code}-${si + 1}`,
          planned_min: planned,
          downtime_min: downtime,
          downtime_reason: downtime > 0 ? reason : "",
          ideal_ct_sec: ct,
          total_qty: total,
          good_qty: good,
          opportunities: m.opp,
          note: ""
        });

        // Điểm lỗi ≈ board lỗi × 1.05-1.25 (1 board có thể nhiều điểm lỗi).
        const weights = DEFECT_WEIGHTS[line.tier]
          .filter(([code]) => code !== "VOD" || m.bga)
          .map(([code, w]): [string, number] => {
            if (ev?.ev.id === "paste" && code === "INS") return [code, w * 4];
            if (ev?.ev.id === "head" && (code === "MIS" || code === "SHF")) return [code, w * 3];
            if (ev?.ev.id === "npi" && m.model === ev.ev.model && code === "VOD") return [code, w * 5];
            if (ev?.ev.id === "escape" && m.model === ev.ev.model && code === "BRG") return [code, w * 3.5];
            if (ev?.ev.id === "polarity" && m.model === ev.ev.model && code === "POL") return [code, w * 8];
            return [code, w];
          });
        const points = Math.round((total - good) * (1.05 + r() * 0.2));
        const customerBoost = ev?.ev.id === "escape" && m.model === ev.ev.model ? 6 : 1;
        for (let k = 0; k < points; k++) {
          const code = pickWeighted(weights, r());
          const detected = detectPoint(code, line.tier, r, customerBoost);
          const key = `${m.model}|${code}|${detected}`;
          const cur = dayDefects.get(key);
          if (cur) {
            cur.qty += 1;
            continue;
          }
          const focus = ev && m.model === ev.ev.model;
          const locs = focus && ev.ev.id === "escape" && code === "BRG" ? ["U5"] : focus && ev.ev.id === "polarity" && code === "POL" ? ["D7"] : LOCATIONS[code] ?? ["-"];
          dayDefects.set(key, {
            log_date: date,
            shift: "",
            line: line.code,
            model: m.model,
            defect_code: code,
            process: PROCESS_OF[code] ?? "other",
            detected_by: detected,
            location: locs[Math.floor(r() * locs.length)],
            part_no: "",
            qty: 1,
            root_cause: "",
            action: ""
          });
        }
      }
      defects.push(...dayDefects.values());
    }
  }
  return { production, defects };
}

// ---------- Cycle time từng trạm ----------
// Mounter chậm nhất = CT chuẩn. Lần đo 2 của L05 MCU-M7 là sau khi cân bằng lại linh kiện giữa các mounter.
export function demoCycleTimes(win: DemoWindow): Array<NoId<CycleTime>> {
  const out: Array<NoId<CycleTime>> = [];
  const ratio = (station: string, r: () => number) => {
    if (station === "Printer") return 0.7 + r() * 0.08;
    if (station.startsWith("SPI")) return 0.62 + r() * 0.08;
    if (station === "M-AOI") return 0.66 + r() * 0.08;
    if (station.startsWith("Reflow")) return 0.52 + r() * 0.06;
    if (station.startsWith("AOI")) return 0.74 + r() * 0.08;
    if (station === "AXI") return 0.88 + r() * 0.07;
    return 0.72 + r() * 0.22;
  };
  for (const line of DEMO_LINES) {
    for (const m of line.models) {
      const r = rng(`ct|${line.code}|${m.model}`);
      const mounters = line.stations.filter((s) => s.startsWith("Mounter"));
      const slowest = mounters[Math.floor(r() * mounters.length)];
      const measured = addDays(win.from, 5);
      for (const station of line.stations) {
        const ct = station === slowest ? m.ct : Math.round(m.ct * ratio(station, r) * 10) / 10;
        out.push({ measured_on: measured, line: line.code, model: m.model, station, cycle_time_sec: ct, note: "" });
      }
      if (line.code === "L05" && m.model === "MCU-M7") {
        const after = addDays(win.from, BALANCE_DAY);
        const balanced: Record<string, number> = { "Mounter 1": 32.4, "Mounter 2": 33, "Mounter 3": 31.8, "Mounter 4": 32.6 };
        for (const row of out.filter((x) => x.line === "L05" && x.model === "MCU-M7" && x.measured_on === measured)) {
          out.push({ ...row, measured_on: after, cycle_time_sec: balanced[row.station] ?? row.cycle_time_sec, note: balanced[row.station] ? "Sau cân bằng line" : "" });
        }
      }
    }
  }
  return out;
}

// ---------- Feeder / Nozzle ----------
const FEEDER_SPECS = ["8mm", "8mm", "8mm", "8mm", "8mm", "8mm", "8mm", "8mm", "12mm", "12mm", "16mm", "24mm"];
const NOZZLE_SPECS = ["N-0402", "N-0603", "N-QFP"];
const TECHS = ["Phạm Đức Huy", "Lê Văn Tài", "KTV ca 1", "KTV ca 2"];

export function demoAssets(win: DemoWindow) {
  const assets: Asset[] = [];
  const logs: AssetLog[] = [];
  const headEv = DEMO_EVENTS.find((e) => e.id === "head")!;
  const head = eventRange(headEv, win);

  for (const line of DEMO_LINES) {
    const load = line.shifts === 2 ? 0.65 : line.tier === "pro" ? 1.1 : 1;
    line.stations.forEach((station) => {
      if (!station.startsWith("Mounter")) return;
      const mn = station.split(" ")[1];
      const items: Array<{ type: Asset["asset_type"]; code: string; spec: string }> = [
        ...FEEDER_SPECS.map((spec, i) => ({ type: "feeder" as const, code: `FD-${line.code}M${mn}-${String(i + 1).padStart(2, "0")}`, spec })),
        ...NOZZLE_SPECS.map((spec, i) => ({ type: "nozzle" as const, code: `NZ-${line.code}M${mn}-${i + 1}`, spec }))
      ];
      for (const it of items) {
        const r = rng(`asset|${it.code}`);
        const interval = it.type === "feeder" ? 90 : 30;
        const id = demoUuid(`asset|${it.code}`);
        const neglected = r() < 0.05; // bỏ sót PM gần nhất -> quá hạn
        const bad = it.type === "feeder" && r() < 0.035; // feeder mòn bánh răng, mispick cao
        const repairedOn = bad && r() < 0.5 ? addDays(win.to, -Math.floor(10 + r() * 40)) : null;
        // Lịch PM: mốc đầu trước kỳ demo, sau đó mỗi chu kỳ ±5 ngày.
        const pms: string[] = [];
        let pm = addDays(win.from, -Math.floor(r() * interval));
        while (pm <= win.to) {
          if (pm >= win.from) pms.push(pm);
          pm = addDays(pm, interval + Math.round((r() - 0.5) * 10));
        }
        if (neglected && pms.length && daysBetween(pms[pms.length - 1], win.to) < interval) pms.pop();
        const lastPm = [addDays(win.from, -Math.floor(r() * interval)), ...pms].sort().pop()!;
        const isHeadNozzle = it.type === "nozzle" && line.code === headEv.line && station === "Mounter 3";

        assets.push({ id, asset_type: it.type, code: it.code, spec: it.spec, machine: `${line.code} · ${station}`, status: r() < 0.015 ? "maintenance" : "active", last_pm_on: lastPm, pm_interval_days: interval, note: bad ? "Theo dõi bánh răng / lò xo" : "" });

        for (const p of pms) logs.push({ id: demoUuid(`pm|${it.code}|${p}`), asset_id: id, log_date: p, event: "pm", picks: 0, mispicks: 0, result: "ok", technician: TECHS[Math.floor(r() * TECHS.length)], note: it.type === "feeder" ? "Vệ sinh, tra dầu, kiểm tra lò xo / pitch" : "Vệ sinh ultrasonic, kiểm tra mòn đầu" });
        if (repairedOn) logs.push({ id: demoUuid(`rp|${it.code}`), asset_id: id, log_date: repairedOn, event: "repair", picks: 0, mispicks: 0, result: "ok", technician: TECHS[0], note: "Thay bánh răng kéo băng" });
        if (isHeadNozzle) logs.push({ id: demoUuid(`rp|${it.code}`), asset_id: id, log_date: head.to, event: "repair", picks: 0, mispicks: 0, result: "ok", technician: TECHS[0], note: "Thay servo đầu hút, hiệu chuẩn lại nozzle" });

        // Nhật ký sử dụng theo tuần.
        for (let d = win.from; d <= win.to; d = addDays(d, 7)) {
          const rw = rng(`use|${it.code}|${d}`);
          const picks = Math.round((it.type === "feeder" ? 9000 : 26000) * load * (0.7 + rw() * 0.6));
          const since = daysBetween([...pms].reverse().find((p) => p <= d) ?? lastPm, d);
          let rate = 0.0005 + rw() * 0.0016 + Math.max(0, since - interval) * 0.00003;
          if (bad && (!repairedOn || d < repairedOn)) rate = 0.006 + rw() * 0.008;
          if (isHeadNozzle && d >= addDays(head.from, -6) && d <= head.to) rate = 0.012 + rw() * 0.01;
          logs.push({ id: demoUuid(`use|${it.code}|${d}`), asset_id: id, log_date: d, event: "usage", picks, mispicks: Math.round(picks * rate), result: "ok", technician: "", note: "" });
        }
      }
    });
  }
  return { assets, logs };
}

// ---------- Thay đổi 4M1E ----------
type ChangeSeed = [day: number, category: ChangeLog["category"], line: string, model: string, item: string, before: string, after: string, reason: string, risk: ChangeLog["risk"], validation: string];

const ROUTINE_CHANGES: ChangeSeed[] = [
  [4, "material", "L03", "LED-D12", "Đổi lot kem hàn SAC305 (cùng hãng)", "Lot 2603-A", "Lot 2604-C", "Lot cũ hết hạn", "low", "SPI 3 board đầu: Volume 85-115%"],
  [11, "man", "L04", "", "Operator mới vận hành Printer ca 3", "Operator cũ chuyển bộ phận", "Operator mới (OJT 2 tuần)", "Luân chuyển nhân sự", "medium", "Kiểm tra kỹ năng theo checklist, giám sát 3 ca đầu"],
  [19, "method", "L07", "ECU-A9", "Tối ưu chương trình AOI 3D: giảm false call", "False call 1.8%", "False call 0.9%", "Giảm tải cho người xác nhận lỗi", "medium", "Chạy song song 500 board với chương trình cũ, không lọt lỗi"],
  [26, "machine", "L10", "", "Nâng cấp firmware Mounter 1-6", "v3.2.1", "v3.4.0", "Khuyến nghị của hãng", "medium", "Chạy thử 2 ca, so sánh mispick & CT"],
  [33, "environment", "L01", "", "Điều chỉnh độ ẩm phòng SMT", "35-65% RH", "40-60% RH", "Giảm tĩnh điện & ẩm linh kiện MSL", "low", "Theo dõi data logger 7 ngày"],
  [40, "material", "L06", "SMR-3P", "Linh kiện 2nd source tụ C45", "Murata GRM21", "Samsung CL21 (đã duyệt AVL)", "Thiếu hàng NCC chính", "high", "FAI 5 board, đo điện dung, AOI 100% lô đầu"],
  [62, "method", "L03", "SNS-T1", "Đổi stencil 0.12 → 0.10mm cho cảm biến", "Stencil 0.12mm", "Stencil 0.10mm step-down", "Chập thiếc chân IC pitch 0.5", "high", "SPI 10 board + AOI, so sánh BRG trước/sau"],
  [74, "machine", "L09", "", "Thay băng tải Reflow N2", "Băng tải cũ (rung)", "Băng tải mới", "Board lệch trong lò", "medium", "Đo profile KIC 3 lần, kiểm tra lệch linh kiện"],
  [88, "man", "L02", "", "Kỹ thuật viên ca 2 mới", "KTV cũ nghỉ việc", "KTV mới (đã đào tạo)", "Thay người", "medium", "Đánh giá tay nghề sau 2 tuần"],
  [109, "method", "L04", "IOT-G4", "Thêm bước nướng PCB 120°C/4h", "Không nướng", "Nướng trước khi in", "PCB để quá 3 tháng, hút ẩm", "low", "Kiểm tra delamination 20 board"],
  [125, "material", "L07", "TBX-7", "Đổi nhà cung cấp PCB", "NCC A", "NCC B (đã audit)", "Giảm chi phí 8%", "high", "FAI 30 board, cross-section 3 board, ICT 100%"],
  [143, "machine", "L04", "", "Bổ sung M-AOI firmware cảnh báo xu hướng lệch", "Chỉ báo NG", "Cảnh báo SPC lệch XY", "Phát hiện sớm lệch đầu hút", "low", "Theo dõi 1 tuần"],
  [152, "method", "L10", "SRV-MB2", "Tăng thời gian peak Reflow 5s", "Peak 245°C · 40s TAL", "Peak 245°C · 45s TAL", "Tăng độ ướt thiếc BGA lớn", "medium", "X-ray 10 board, cross-section 2 board"],
  [176, "environment", "L08", "", "Kiểm định lại hệ thống khí N2", "O2 < 1000 ppm", "O2 < 800 ppm", "Yêu cầu khách hàng ô tô", "low", "Đo O2 trong lò mỗi ca"],
  [185, "man", "L05", "", "Chuyển Leader ca 1 sang ca 3", "Leader A", "Leader B", "Cân đối kinh nghiệm giữa các ca", "low", "Theo dõi KPI ca 2 tuần"]
];

export function demoChanges(win: DemoWindow): ChangeLog[] {
  const ev = (id: EventId) => eventRange(DEMO_EVENTS.find((e) => e.id === id)!, win);
  const paste = ev("paste");
  const head = ev("head");
  const npi = ev("npi");
  const escape = ev("escape");
  const highmix = ev("highmix");
  const polarity = ev("polarity");
  const seeds: Array<ChangeSeed & { at: string; result?: ChangeLog["result"]; status?: ChangeLog["status"] }> = [
    ...ROUTINE_CHANGES.map((c) => Object.assign([...c] as ChangeSeed, { at: addDays(win.from, c[0]) })),
    Object.assign([0, "material", "L02", "PSU-65W", "Đổi lot kem hàn sang hãng thay thế", "Kem A lot 2605", "Kem B (độ nhớt cao hơn)", "Hết hàng kem A", "medium", "SPI 3 board đầu"] as ChangeSeed, { at: paste.from, result: "ng" as const, status: "rejected" as const }),
    Object.assign([0, "material", "L02", "PSU-65W", "Quay lại kem A + kiểm soát thời gian mở nắp ≤ 8h", "Kem B", "Kem A lot 2605-D", "8D thiếu thiếc", "medium", "SPI Volume 90-110% trong 3 ngày"] as ChangeSeed, { at: addDays(paste.to, 1) }),
    Object.assign([0, "machine", "L05", "", "Thay servo đầu hút Mounter 3", "Servo cũ (lỗi encoder)", "Servo mới", "Dừng máy & mispick tăng", "medium", "Board kính kiểm tra lệch XY, chạy 200 board"] as ChangeSeed, { at: head.to }),
    Object.assign([0, "method", "L05", "MCU-M7", "Cân bằng line: chia lại linh kiện Mounter 1-4", "CT nút thắt 36s (M1)", "CT nút thắt 33s", "Tăng UPH 9%", "medium", "Đo CT 3 lần, kiểm tra chương trình"] as ChangeSeed, { at: addDays(win.from, BALANCE_DAY) }),
    Object.assign([0, "method", "L08", "ECU-A9", "Profile Reflow: soak 60 → 75s, thêm vùng N2", "Soak 60s", "Soak 75s", "Void BGA > 25% (NPI rev C)", "high", "X-ray 30 board: void < 15%"] as ChangeSeed, { at: addDays(npi.from, 6) }),
    Object.assign([0, "method", "L01", "PSU-65W", "Stencil mới aperture U5 giảm 10% + giới hạn 60.000 lần in", "Stencil 85.000 lần in", "Stencil mới home-plate", "8D khách hàng chập thiếc U5", "high", "SPI U5 92-108%, 5.000 board 0 lỗi"] as ChangeSeed, { at: addDays(escape.to, 3) }),
    Object.assign([0, "method", "L01", "", "Đưa thay đổi chương trình AOI vào quy trình 4M", "Chỉnh ngưỡng AOI tự do", "Thay đổi AOI phải duyệt 4M", "Bài học 8D (lọt lỗi)", "medium", "Audit chương trình AOI hàng tháng"] as ChangeSeed, { at: addDays(escape.to, 8) }),
    Object.assign([0, "method", "L09", "", "SMED: chuẩn bị feeder cart offline", "Đổi model 14 phút", "Mục tiêu 8 phút", "Đơn hàng high-mix", "low", "Đo thời gian 10 lần đổi model"] as ChangeSeed, { at: addDays(highmix.to, -5), result: "pending" as const, status: "implemented" as const }),
    Object.assign([0, "material", "L06", "INV-2K", "Đổi nhà cung cấp cuộn diode D7", "NCC cũ (chiều cuộn chuẩn)", "NCC mới (ngược chiều cuộn)", "Giảm giá 12%", "high", "FAI 5 board"] as ChangeSeed, { at: polarity.from, result: "ng" as const, status: "implemented" as const })
  ];

  return seeds
    .filter((c) => c.at <= win.to)
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((c, i) => {
      const [, category, line, model, item, before, after, reason, risk, validation] = c;
      const age = daysBetween(c.at, win.to);
      const status = c.status ?? (age > 14 ? "verified" : age > 4 ? "implemented" : "planned");
      const result = c.result ?? (status === "verified" ? "ok" : "pending");
      return {
        id: demoUuid(`4m|${i}|${item}`),
        code: `4M-${c.at.slice(2, 4)}${c.at.slice(5, 7)}-${String(i + 1).padStart(2, "0")}`,
        change_date: c.at,
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
        approved_by: risk === "high" ? "QA Manager + Khách hàng" : "QA Manager",
        is_public: true,
        note: ""
      };
    });
}

// ---------- 8D ----------
type Team = EightDContent["d1"]["team"];
const TEAM_BASE: Team = [
  { name: "Mr Jay", role: "Trưởng nhóm (SMT Manager)", dept: "Kỹ thuật SMT" },
  { name: "Võ Thu Hà", role: "QA / làm việc với khách", dept: "QA" }
];

export function demoEightDs(win: DemoWindow): EightDReport[] {
  const out: EightDReport[] = [];
  const ev = (id: EventId) => eventRange(DEMO_EVENTS.find((e) => e.id === id)!, win);
  const code = (date: string, n: number) => `8D-${date.slice(2, 4)}${date.slice(5, 7)}-${String(n).padStart(2, "0")}`;
  const action = (a: string, owner: string, due: string, result: string, done = true) => ({ action: a, owner, due, status: done ? ("done" as const) : ("open" as const), result });

  // 1) Thiếu thiếc L02 (nội bộ, đã đóng)
  const paste = ev("paste");
  if (paste.to <= win.to) {
    const opened = addDays(paste.from, 2);
    const c = emptyEightDContent();
    c.d0 = { symptom: "FPY L02 giảm từ 96.8% xuống ~94%, lỗi thiếu thiếc (INS) tăng gấp 4 lần, SPI báo Volume thấp.", emergencyAction: "Tăng kiểm tra SPI 100%, rửa và in lại board có Volume < 70%.", need8d: "Có – lỗi lặp lại nhiều ca, ảnh hưởng FPY." };
    c.d1.team = [...TEAM_BASE, { name: "Trần Thị Mai", role: "Process Engineer", dept: "Kỹ thuật SMT" }];
    c.d2 = { what: "Thiếu thiếc (INS) pad tụ C14 / điện trở R33", where: "L02, model PSU-65W & CHG-20W", when: `${paste.from} → ${paste.to}`, who: "Phát hiện tại SPI & AOI", why: "Kem hàn thay thế có độ nhớt cao, khô nhanh trên stencil", how: "Volume kem < 70% ở aperture nhỏ", howMany: "≈ 3% board bị INS trong 12 ngày", statement: "Sau khi đổi kem hàn hãng B, L02 bị thiếu thiếc hàng loạt do kem khô sớm trên stencil." };
    c.d3 = { actions: [action("Sort 100% board WIP bằng SPI + AOI", "QA", addDays(opened, 1), "1.240 board, 52 board rework")], stockCheck: "WIP: 2 lô · Thành phẩm: 0 (chưa giao)" };
    c.d4.fishbone = { man: ["Chưa có hướng dẫn thời gian mở nắp cho kem mới"], machine: [], material: ["Kem B độ nhớt cao, khô nhanh"], method: ["Đổi kem không đánh giá đủ (chỉ SPI 3 board)"], measurement: ["SPI chưa cảnh báo xu hướng Volume giảm"], environment: ["Nhiệt độ phòng 27°C"] };
    c.d4.whyOccur = ["Vì sao thiếu thiếc? → Volume kem thấp.", "Vì sao Volume thấp? → Kem khô, không xuống hết aperture.", "Vì sao khô? → Kem B khô nhanh hơn ở 27°C.", "Vì sao dùng kem B? → Hết kem A, đổi gấp.", "Vì sao đổi gấp không thử đủ? → Quy trình 4M chưa yêu cầu thử 1 ca cho vật tư thay thế."];
    c.d4.rootOccur = "Đánh giá thay đổi vật tư (4M Material) chưa đủ: chỉ thử 3 board, không thử thời gian dừng.";
    c.d4.rootEscape = "SPI chỉ báo NG từng board, chưa có cảnh báo xu hướng.";
    c.d5.actions = [action("Quay lại kem A, giới hạn thời gian mở nắp ≤ 8h", "Trần Thị Mai", addDays(opened, 3), "Volume 90-110%")];
    c.d6 = { actions: [action("Theo dõi FPY 2 tuần", "Trần Thị Mai", addDays(opened, 16), "FPY 96.9%")], effectiveness: "INS trở về mức nền sau 3 ngày." };
    c.d7 = { actions: [action("Sửa quy trình 4M: vật tư thay thế phải chạy thử 1 ca", "QA", addDays(opened, 10), "Cập nhật QP-SMT-012")], documents: ["QP-SMT-012", "WI-PRT-001"] };
    c.d8 = { recognition: "Nhóm phản ứng nhanh, không có lỗi đến khách.", lessons: "Vật tư thay thế cũng là thay đổi 4M, phải thử trong điều kiện sản xuất thật.", closedBy: "QA Manager" };
    out.push(report(code(opened, 1), "Thiếu thiếc hàng loạt sau khi đổi kem hàn – L02", "closed", "major", "Nội bộ", "L02", "PSU-65W", "INS", "Trần Thị Mai", opened, addDays(opened, 30), addDays(opened, 18), c));
  }

  // 2) Void BGA NPI L08 (đã đóng)
  const npi = ev("npi");
  if (npi.from <= win.to) {
    const opened = addDays(npi.from, 3);
    const closed = addDays(npi.to, 6);
    const c = emptyEightDContent();
    c.d0 = { symptom: "AXI báo void BGA U1 > 25% trên ECU-A9 rev C (giới hạn khách hàng ô tô: 25%).", emergencyAction: "Giữ lô NPI, X-ray 100% U1.", need8d: "Có – sản phẩm ô tô, khách yêu cầu 8D." };
    c.d1.team = [...TEAM_BASE, { name: "Bùi Thanh Tùng", role: "NPI Engineer", dept: "NPI" }, { name: "Nguyễn Hoàng Nam", role: "Process Engineer", dept: "Kỹ thuật SMT" }];
    c.d2 = { what: "Void BGA U1 > 25%", where: "L08, ECU-A9 rev C", when: `NPI từ ${npi.from}`, who: "AXI inline phát hiện", why: "Pad via-in-pad rev C giữ khí, profile soak ngắn", how: "Ảnh X-ray void tập trung giữa BGA", howMany: "≈ 4% board NPI", statement: "ECU-A9 rev C có void BGA vượt giới hạn do thiết kế via-in-pad mới và profile chưa tối ưu." };
    c.d3 = { actions: [action("X-ray 100% U1 lô NPI", "QA", addDays(opened, 1), "Loại 38 board")], stockCheck: "Lô NPI 900 board: đã X-ray 100%" };
    c.d4.fishbone = { man: [], machine: ["Vùng N2 chưa bật cho model mới"], material: ["Via-in-pad chưa lấp đầy (rev C)"], method: ["Profile soak 60s copy từ rev B"], measurement: [], environment: [] };
    c.d4.whyOccur = ["Vì sao void cao? → Khí không thoát hết khi thiếc nóng chảy.", "Vì sao không thoát? → Thời gian soak ngắn.", "Vì sao soak ngắn? → Copy profile rev B.", "Vì sao copy? → Checklist NPI chưa yêu cầu làm lại profile khi đổi pad.", "Vì sao checklist thiếu? → Chưa có bài học từ dự án trước."];
    c.d4.rootOccur = "Profile reflow không được tối ưu lại cho thiết kế via-in-pad rev C.";
    c.d4.rootEscape = "Không lọt – AXI inline bắt được (ưu điểm line Pro).";
    c.d5.actions = [action("Soak 75s + bật N2 (O2 < 800ppm)", "Nguyễn Hoàng Nam", addDays(opened, 4), "Void trung bình 9%")];
    c.d6 = { actions: [action("X-ray 30 board xác nhận", "Bùi Thanh Tùng", addDays(opened, 8), "Void max 14%")], effectiveness: "Tỉ lệ void > 25%: 4% → 0%." };
    c.d7 = { actions: [action("Thêm bước 'làm lại profile khi đổi pad/stack-up' vào checklist NPI", "Bùi Thanh Tùng", addDays(opened, 12), "Checklist NPI rev 5")], documents: ["Checklist NPI rev 5", "Profile ECU-A9-C"] };
    c.d8 = { recognition: "AXI inline giúp không có board lỗi đến khách.", lessons: "Thay đổi thiết kế pad = phải tối ưu lại profile.", closedBy: "QA Manager" };
    out.push(report(code(opened, 1), "Void BGA vượt giới hạn – NPI ECU-A9 rev C", closed <= win.to ? "closed" : "verification", "major", "Khách hàng ô tô B", "L08", "ECU-A9", "VOD", "Bùi Thanh Tùng", opened, addDays(opened, 30), closed <= win.to ? closed : null, c));
  }

  // 3) Khách hàng phàn nàn chập thiếc QFN (nghiêm trọng, đã đóng) – case đầy đủ nhất
  const escape = ev("escape");
  if (escape.to <= win.to) {
    const opened = addDays(escape.to, 1);
    const closed = addDays(opened, 21);
    out.push(fullEscapeEightD(code(opened, 2), opened, closed <= win.to ? closed : null, escape));
  }

  // 4) Ngược cực diode L06 (đang phân tích)
  const pol = ev("polarity");
  if (pol.from <= win.to) {
    const opened = addDays(pol.from, 2) > win.to ? win.to : addDays(pol.from, 2);
    const c = emptyEightDContent();
    c.d0 = { symptom: "M-AOI L06 báo ngược cực diode D7 trên INV-2K, tỉ lệ ~1%.", emergencyAction: "Dừng dùng cuộn NCC mới, kiểm tra 100% D7 bằng M-AOI.", need8d: "Có – lỗi hàng loạt do thay đổi vật tư." };
    c.d1.team = [...TEAM_BASE, { name: "Huỳnh Ngọc Lan", role: "Process Engineer", dept: "Kỹ thuật SMT" }, { name: "Đặng Quốc Bảo", role: "AOI Programmer", dept: "Kỹ thuật" }];
    c.d2 = { what: "Ngược cực diode D7", where: "L06, INV-2K", when: `Từ ${pol.from}`, who: "M-AOI phát hiện trước lò", why: "Cuộn NCC mới có chiều linh kiện ngược so với chuẩn EIA-481", how: "Vạch cực tính ngược 180°", howMany: "≈ 1% board, đã sửa trước lò", statement: "Sau khi đổi NCC cuộn diode D7, linh kiện được gắn ngược cực do chiều cuộn khác." };
    c.d3 = { actions: [action("Cách ly cuộn NCC mới, quay lại NCC cũ", "Huỳnh Ngọc Lan", addDays(opened, 1), "Đã thực hiện"), action("Rà M-AOI 100% D7 các lô đã chạy", "Đặng Quốc Bảo", addDays(opened, 2), "Đang làm", false)], stockCheck: "Thành phẩm: 0 lỗi (M-AOI bắt trước lò)" };
    c.d4.fishbone = { man: [], machine: [], material: ["Chiều cuộn NCC mới khác"], method: ["FAI 5 board không kiểm cực tính từng cuộn"], measurement: [], environment: [] };
    c.d4.whyOccur = ["Vì sao ngược cực? → Linh kiện trong cuộn quay 180°.", "Vì sao? → NCC mới đóng cuộn khác chuẩn.", "", "", ""];
    out.push(report(code(opened, 3), "Ngược cực diode D7 sau khi đổi NCC cuộn – INV-2K", "analysis", "major", "Nội bộ", "L06", "INV-2K", "POL", "Huỳnh Ngọc Lan", opened, addDays(opened, 21), null, c));
  }
  return out;

  function report(code: string, title: string, status: EightDReport["status"], severity: EightDReport["severity"], customer: string, line: string, model: string, defect: string, owner: string, opened: string, due: string, closed: string | null, content: EightDContent): EightDReport {
    return { id: demoUuid(`8d|${code}`), code, title, status, severity, customer, line, model, defect_code: defect, owner, opened_on: opened, due_on: due, closed_on: closed, content, is_public: true };
  }
}

function fullEscapeEightD(code: string, opened: string, closed: string | null, ev: { from: string; to: string }): EightDReport {
  const c = emptyEightDContent();
  c.d0 = {
    symptom: "Khách hàng báo 6/1.200 board PSU-65W lỗi chức năng, phân tích lại thấy chập thiếc giữa chân 14-15 của IC QFN U5.",
    emergencyAction: "Dừng giao lô đang chờ; X-ray/AOI 100% vị trí U5 cho các lô còn tồn.",
    need8d: "Có – lỗi đến tay khách hàng, ảnh hưởng chức năng, cần phân tích gốc rễ."
  };
  c.d1.team = [
    { name: "Mr Jay", role: "Trưởng nhóm (SMT Manager)", dept: "Kỹ thuật SMT" },
    { name: "Võ Thu Hà", role: "QA / làm việc với khách", dept: "QA" },
    { name: "Trần Thị Mai", role: "Printer & Reflow", dept: "Kỹ thuật SMT" },
    { name: "Đặng Quốc Bảo", role: "Chương trình AOI", dept: "Kỹ thuật" }
  ];
  c.d2 = {
    what: "Chập thiếc (bridge) chân 14-15 IC QFN-32 U5",
    where: "L01 (line cơ bản, không M-AOI), model PSU-65W, phát hiện tại khách hàng (FCT)",
    when: `Lô sản xuất ${ev.from} → ${ev.to}`,
    who: "Khách hàng phát hiện; ca 1 & ca 2 sản xuất",
    why: "Kem hàn thừa ở pad pitch 0.5mm do stencil mòn, AOI không bắt được do ngưỡng rộng",
    how: "Chập 2 chân liền kề, chỉ thấy rõ khi nghiêng góc / X-ray",
    howMany: "6 board lỗi / 1.200 giao (5.000 PPM); 18 board lỗi thêm trong 3.400 board tồn kho",
    statement: "Board PSU-65W sản xuất trên L01 bị chập thiếc chân 14-15 của U5 với tỉ lệ ~5.000 PPM, lọt qua AOI và đến tay khách hàng."
  };
  c.d3 = {
    actions: [
      { action: "Cách ly 3.400 board tồn kho & 2 lô WIP, X-ray 100% U5", owner: "QA", due: addDays(opened, 1), status: "done", result: "18 board NG đã rework, 3.382 board OK" },
      { action: "Gửi thay thế 6 board cho khách, sort tại kho khách 1.194 board", owner: "QA", due: addDays(opened, 2), status: "done", result: "Không thấy thêm lỗi" },
      { action: "Siết ngưỡng AOI vị trí U5 (bridge) tạm thời", owner: "Đặng Quốc Bảo", due: addDays(opened, 1), status: "done", result: "Bắt được 100% mẫu lỗi" }
    ],
    stockCheck: "Kho thành phẩm: 3.400 · WIP: 2 lô · Đang vận chuyển: 0 · Tại khách: 1.200"
  };
  c.d4 = {
    fishbone: {
      man: ["Lau stencil không đúng tần suất ca 2"],
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
    rootEscape: "Chương trình AOI được nới ngưỡng mà không qua quy trình duyệt thay đổi (ngoài phạm vi 4M). Line L01 không có M-AOI/AXI để chặn thêm.",
    verification: "Tái hiện: in 20 board bằng stencil cũ → 3 board bridge; stencil mới → 0/20. AOI ngưỡng 20% bắt được 6/6 mẫu lỗi."
  };
  c.d5 = {
    actions: [
      { action: "Thay stencil mới, aperture U5 giảm 10% (home-plate)", owner: "Trần Thị Mai", due: addDays(opened, 5), status: "done", result: "SPI volume U5: 92-108%" },
      { action: "Đặt ngưỡng AOI bridge QFN = 20%, khoá chỉnh sửa bằng mật khẩu", owner: "Đặng Quốc Bảo", due: addDays(opened, 4), status: "done", result: "False call tăng 0.3%, chấp nhận" }
    ]
  };
  c.d6 = {
    actions: [
      { action: "Chạy 5.000 board theo dõi lỗi bridge U5", owner: "Trần Thị Mai", due: addDays(opened, 14), status: "done", result: "0 lỗi / 5.000 board" },
      { action: "SPI bật kiểm tra bridge 2D cho QFN", owner: "Trần Thị Mai", due: addDays(opened, 7), status: "done", result: "Hoạt động" }
    ],
    effectiveness: "Trước: 5.000 PPM → Sau: 0 PPM trong 3 tuần theo dõi."
  };
  c.d7 = {
    actions: [
      { action: "Thêm đếm số lần in vào phiếu quản lý stencil, giới hạn 60.000 lần", owner: "Trần Thị Mai", due: addDays(opened, 10), status: "done", result: "Áp dụng cho toàn bộ stencil" },
      { action: "Đưa thay đổi chương trình AOI/SPI vào quy trình 4M (Method)", owner: "Võ Thu Hà", due: addDays(opened, 12), status: "done", result: "Cập nhật QP-SMT-012" },
      { action: "Đề xuất lắp M-AOI cho line cơ bản chạy model có QFN pitch ≤ 0.5mm", owner: "Mr Jay", due: addDays(opened, 20), status: "open", result: "Đang làm dự toán" }
    ],
    documents: ["PFMEA SMT – cập nhật mục Printing", "Control Plan PSU-65W rev.C", "WI-PRT-003 Quản lý stencil", "QP-SMT-012 Quản lý thay đổi 4M"]
  };
  c.d8 = {
    recognition: "Nhóm 8D hoàn thành đúng hạn, khách hàng chấp nhận báo cáo.",
    lessons: "Thiết bị tiêu hao (stencil, nozzle, dao gạt) cần quản lý theo tuổi thọ; mọi thay đổi chương trình kiểm tra là thay đổi 4M.",
    closedBy: "QA Manager"
  };
  return {
    id: demoUuid(`8d|${code}`),
    code,
    title: "Chập thiếc chân IC QFN U5 – PSU-65W (khách hàng phàn nàn)",
    status: closed ? "closed" : "verification",
    severity: "critical",
    customer: "Khách hàng A (ẩn danh)",
    line: "L01",
    model: "PSU-65W",
    defect_code: "BRG",
    owner: "Mr Jay",
    opened_on: opened,
    due_on: addDays(opened, 30),
    closed_on: closed,
    content: c,
    is_public: true
  };
}

// ---------- Gói dữ liệu tính trong bộ nhớ (khi chưa tạo demo trong database) ----------
export function buildDemoBundle(days = 30, endDate = todayVn()): SmtDataBundle {
  const win = demoWindow(endDate);
  const from = addDays(endDate, -(days - 1));
  const { production, defects } = demoDays(win, from, endDate);
  const { assets, logs } = demoAssets(win);
  let seq = 0;
  const withId = <T,>(prefix: string, rows: Array<NoId<T>>) => rows.map((r) => ({ id: `demo-${prefix}-${++seq}`, ...r }) as T);
  return {
    production: withId<ProductionLog>("p", production),
    defects: withId<DefectLog>("d", defects),
    cycleTimes: withId<CycleTime>("ct", demoCycleTimes(win)),
    changes: demoChanges(win),
    assets,
    assetLogs: logs.filter((l) => l.log_date >= addDays(from, -120)),
    eightD: demoEightDs(win).sort((a, b) => b.opened_on.localeCompare(a.opened_on))
  };
}
