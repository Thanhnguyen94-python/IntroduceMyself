import { CHANGE_CATEGORIES, addDays, daysBetween } from "@/lib/smt/types";
import type { Asset, AssetLog, ChangeLog, CycleTime, DefectLog, ProductionLog, SmtSettings } from "@/lib/smt/types";

// Công thức KPI SMT (thuần, không I/O): dùng chung cho trang công khai, Admin và file Excel.
//
//  Availability (A) = (Kế hoạch − Dừng máy) / Kế hoạch
//  Performance  (P) = (CT chuẩn × Tổng sản lượng) / Thời gian chạy
//  Quality      (Q) = Đạt lần đầu / Tổng sản lượng            (= FPY)
//  OEE              = A × P × Q
//  DPMO             = Điểm lỗi / (Board × Cơ hội lỗi mỗi board) × 1.000.000
//  PPM (board)      = Board lỗi / Tổng board × 1.000.000
//  Line balance     = Σ CT trạm / (Số trạm × CT trạm chậm nhất)

export type Filter = { line?: string; from?: string; to?: string };

export const inRange = (date: string, f: Filter) => (!f.from || date >= f.from) && (!f.to || date <= f.to);
const byLine = (line: string, f: Filter) => !f.line || line === f.line;
const safe = (a: number, b: number) => (b > 0 ? a / b : 0);

export type OeeParts = { planned: number; downtime: number; runMin: number; idealMin: number; total: number; good: number; availability: number; performance: number; quality: number; oee: number };

export function oeeOf(logs: ProductionLog[]): OeeParts {
  const planned = logs.reduce((s, l) => s + l.planned_min, 0);
  const downtime = logs.reduce((s, l) => s + Math.min(l.downtime_min, l.planned_min), 0);
  const runMin = planned - downtime;
  const idealMin = logs.reduce((s, l) => s + (l.ideal_ct_sec * l.total_qty) / 60, 0);
  const total = logs.reduce((s, l) => s + l.total_qty, 0);
  const good = logs.reduce((s, l) => s + Math.min(l.good_qty, l.total_qty), 0);
  const availability = safe(runMin, planned);
  // Performance > 100% nghĩa là CT chuẩn khai báo sai -> giới hạn 100% để OEE không vượt thực tế.
  const performance = Math.min(1, safe(idealMin, runMin));
  const quality = safe(good, total);
  return { planned, downtime, runMin, idealMin, total, good, availability, performance, quality, oee: availability * performance * quality };
}

export function filterProduction(rows: ProductionLog[], f: Filter) {
  return rows.filter((r) => inRange(r.log_date, f) && byLine(r.line, f));
}

export function filterDefects(rows: DefectLog[], f: Filter) {
  return rows.filter((r) => inRange(r.log_date, f) && byLine(r.line, f));
}

// Danh sách ngày liên tục from..to (để biểu đồ không bị "nhảy cóc" ngày không có dữ liệu).
export function dateSpan(from: string, to: string) {
  const n = Math.max(0, Math.min(400, daysBetween(from, to)));
  return Array.from({ length: n + 1 }, (_, i) => addDays(from, i));
}

export function buildOeeReport(production: ProductionLog[], cycleTimes: CycleTime[], settings: SmtSettings, f: Required<Pick<Filter, "from" | "to">> & Filter) {
  const logs = filterProduction(production, f);
  const total = oeeOf(logs);
  const daily = dateSpan(f.from, f.to).map((date) => {
    const day = logs.filter((l) => l.log_date === date);
    return { date, ...oeeOf(day), has: day.length > 0 };
  });
  const lines = settings.lines
    .filter((l) => byLine(l.code, f))
    .map((l) => ({ code: l.code, name: l.name, ...oeeOf(logs.filter((x) => x.line === l.code)) }));
  const shifts = [...new Set(logs.map((l) => l.shift))].map((shift) => ({ shift, ...oeeOf(logs.filter((l) => l.shift === shift)) }));

  const reasonMap = new Map<string, number>();
  for (const l of logs) if (l.downtime_min > 0) reasonMap.set(l.downtime_reason || "Không ghi lý do", (reasonMap.get(l.downtime_reason || "Không ghi lý do") ?? 0) + l.downtime_min);
  const downtime = [...reasonMap].map(([reason, minutes]) => ({ reason, minutes })).sort((a, b) => b.minutes - a.minutes);

  // 6 tổn thất lớn quy về phút: dừng máy, chậm tốc độ, mất do lỗi chất lượng.
  const speedLossMin = Math.max(0, total.runMin - total.idealMin);
  const qualityLossMin = logs.reduce((s, l) => s + (l.ideal_ct_sec * Math.max(0, l.total_qty - l.good_qty)) / 60, 0);
  const losses = { downtime: total.downtime, speed: speedLossMin, quality: qualityLossMin, valuable: Math.max(0, total.planned - total.downtime - speedLossMin - qualityLossMin) };

  return { total, daily, lines, shifts, downtime, losses, balance: buildLineBalance(cycleTimes, settings, f) };
}

export type BalanceResult = {
  line: string;
  model: string;
  measuredOn: string;
  takt: number;
  stations: Array<{ station: string; ct: number }>;
  bottleneck: { station: string; ct: number };
  efficiency: number;
  // Sản lượng tối đa theo trạm chậm nhất trong 1 giờ
  uph: number;
};

// Lấy lần đo mới nhất của mỗi (line, model).
export function buildLineBalance(cycleTimes: CycleTime[], settings: SmtSettings, f: Filter = {}): BalanceResult[] {
  const groups = new Map<string, CycleTime[]>();
  for (const ct of cycleTimes) {
    if (!byLine(ct.line, f)) continue;
    const key = `${ct.line}|${ct.model}`;
    groups.set(key, [...(groups.get(key) ?? []), ct]);
  }
  const out: BalanceResult[] = [];
  for (const [key, rows] of groups) {
    const [line, model] = key.split("|");
    const latest = rows.reduce((m, r) => (r.measured_on > m ? r.measured_on : m), "");
    const lineCfg = settings.lines.find((l) => l.code === line);
    const order = lineCfg?.stations ?? [];
    const stationMap = new Map<string, number>();
    for (const r of rows.filter((r) => r.measured_on === latest)) stationMap.set(r.station, r.cycle_time_sec);
    const stations = [...stationMap]
      .map(([station, ct]) => ({ station, ct }))
      .sort((a, b) => (order.indexOf(a.station) + 1 || 99) - (order.indexOf(b.station) + 1 || 99));
    if (!stations.length) continue;
    const bottleneck = stations.reduce((m, s) => (s.ct > m.ct ? s : m), stations[0]);
    const sum = stations.reduce((s, x) => s + x.ct, 0);
    out.push({
      line,
      model,
      measuredOn: latest,
      takt: lineCfg?.taktSec ?? 0,
      stations,
      bottleneck,
      efficiency: safe(sum, stations.length * bottleneck.ct),
      uph: bottleneck.ct > 0 ? 3600 / bottleneck.ct : 0
    });
  }
  return out.sort((a, b) => a.line.localeCompare(b.line) || a.model.localeCompare(b.model));
}

export function buildYieldReport(production: ProductionLog[], defects: DefectLog[], settings: SmtSettings, f: Required<Pick<Filter, "from" | "to">> & Filter) {
  const logs = filterProduction(production, f);
  const defs = filterDefects(defects, f);
  const boards = logs.reduce((s, l) => s + l.total_qty, 0);
  const good = logs.reduce((s, l) => s + Math.min(l.good_qty, l.total_qty), 0);
  const opportunities = logs.reduce((s, l) => s + l.total_qty * l.opportunities, 0);
  const points = defs.reduce((s, d) => s + d.qty, 0);
  const fpy = safe(good, boards);
  const dpmo = safe(points, opportunities) * 1_000_000;
  const ppm = safe(boards - good, boards) * 1_000_000;

  const name = (code: string) => settings.defectCatalog.find((d) => d.code === code);
  const codeMap = new Map<string, number>();
  for (const d of defs) codeMap.set(d.defect_code, (codeMap.get(d.defect_code) ?? 0) + d.qty);
  let cum = 0;
  const pareto = [...codeMap]
    .map(([code, qty]) => ({ code, qty }))
    .sort((a, b) => b.qty - a.qty)
    .map((row) => {
      cum += row.qty;
      const cat = name(row.code);
      return { ...row, vi: cat?.vi ?? row.code, en: cat?.en ?? row.code, share: safe(row.qty, points), cumulative: safe(cum, points) };
    });

  const group = <K extends keyof DefectLog>(key: K) => {
    const map = new Map<string, number>();
    for (const d of defs) map.set(String(d[key] || "—"), (map.get(String(d[key] || "—")) ?? 0) + d.qty);
    return [...map].map(([label, qty]) => ({ label, qty })).sort((a, b) => b.qty - a.qty);
  };

  const locMap = new Map<string, { location: string; model: string; code: string; qty: number }>();
  for (const d of defs) {
    if (!d.location) continue;
    const key = `${d.model}|${d.location}|${d.defect_code}`;
    const cur = locMap.get(key) ?? { location: d.location, model: d.model, code: d.defect_code, qty: 0 };
    cur.qty += d.qty;
    locMap.set(key, cur);
  }

  const daily = dateSpan(f.from, f.to).map((date) => {
    const day = logs.filter((l) => l.log_date === date);
    const b = day.reduce((s, l) => s + l.total_qty, 0);
    const g = day.reduce((s, l) => s + Math.min(l.good_qty, l.total_qty), 0);
    const opp = day.reduce((s, l) => s + l.total_qty * l.opportunities, 0);
    const p = defs.filter((d) => d.log_date === date).reduce((s, d) => s + d.qty, 0);
    return { date, boards: b, fpy: safe(g, b), dpmo: safe(p, opp) * 1_000_000, defects: p, has: day.length > 0 };
  });

  const models = [...new Set(logs.map((l) => l.model))].map((model) => {
    const m = logs.filter((l) => l.model === model);
    const b = m.reduce((s, l) => s + l.total_qty, 0);
    const g = m.reduce((s, l) => s + Math.min(l.good_qty, l.total_qty), 0);
    const opp = m.reduce((s, l) => s + l.total_qty * l.opportunities, 0);
    const p = defs.filter((d) => d.model === model).reduce((s, d) => s + d.qty, 0);
    return { model, boards: b, fpy: safe(g, b), dpmo: safe(p, opp) * 1_000_000, defects: p };
  });

  return {
    boards,
    good,
    points,
    fpy,
    dpmo,
    ppm,
    pareto,
    byProcess: group("process"),
    byDetect: group("detected_by"),
    topLocations: [...locMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 10),
    daily,
    models: models.sort((a, b) => a.fpy - b.fpy)
  };
}

export type AssetHealth = Asset & {
  picks: number;
  mispicks: number;
  rate: number;
  nextPm: string | null;
  daysToPm: number | null;
  health: "good" | "warning" | "critical";
  reasons: string[];
  lastEvent: AssetLog | null;
};

// Đánh giá sức khoẻ: tỉ lệ hút hỏng so với mục tiêu + hạn bảo dưỡng.
//  critical: mispick > 2× mục tiêu, hoặc quá hạn PM, hoặc lần kiểm tra gần nhất NG
//  warning : mispick > mục tiêu, hoặc PM đến hạn trong 7 ngày, hoặc đang bảo dưỡng
export function buildAssetHealth(assets: Asset[], logs: AssetLog[], settings: SmtSettings, f: Filter & { to: string }): AssetHealth[] {
  const target = settings.targets.mispickRate;
  return assets
    .filter((a) => a.status !== "retired")
    .map((a) => {
      const mine = logs.filter((l) => l.asset_id === a.id && inRange(l.log_date, f));
      const picks = mine.reduce((s, l) => s + l.picks, 0);
      const mispicks = mine.reduce((s, l) => s + l.mispicks, 0);
      const rate = safe(mispicks, picks);
      const allMine = logs.filter((l) => l.asset_id === a.id).sort((x, y) => y.log_date.localeCompare(x.log_date));
      const lastPm = [a.last_pm_on, ...allMine.filter((l) => l.event === "pm").map((l) => l.log_date)].filter(Boolean).sort().pop() ?? null;
      const nextPm = lastPm ? addDays(lastPm, a.pm_interval_days) : null;
      const daysToPm = nextPm ? daysBetween(f.to, nextPm) : null;
      const lastCheck = allMine.find((l) => l.event !== "usage") ?? null;
      const reasons: string[] = [];
      let health: AssetHealth["health"] = "good";
      if (picks > 0 && rate > target * 2) reasons.push("Mispick > 2× mục tiêu");
      if (daysToPm !== null && daysToPm < 0) reasons.push(`Quá hạn PM ${-daysToPm} ngày`);
      if (!lastPm) reasons.push("Chưa có ngày PM");
      if (lastCheck?.result === "ng") reasons.push("Lần kiểm tra gần nhất NG");
      if (reasons.length) health = "critical";
      else {
        if (picks > 0 && rate > target) reasons.push("Mispick > mục tiêu");
        if (daysToPm !== null && daysToPm <= 7) reasons.push(`PM đến hạn sau ${daysToPm} ngày`);
        if (a.status === "maintenance") reasons.push("Đang bảo dưỡng");
        if (reasons.length) health = "warning";
      }
      return { ...a, picks, mispicks, rate, nextPm, daysToPm, health, reasons, lastEvent: allMine[0] ?? null };
    })
    .sort((x, y) => rank(y.health) - rank(x.health) || y.rate - x.rate);
}
const rank = (h: AssetHealth["health"]) => (h === "critical" ? 2 : h === "warning" ? 1 : 0);

// Ma trận 4M1E: số thay đổi theo hạng mục × trạng thái + mức rủi ro.
export function buildChangeMatrix(changes: ChangeLog[], f: Filter) {
  // Thay đổi không ghi line = áp dụng mọi line -> luôn hiện.
  const rows = changes.filter((c) => inRange(c.change_date, f) && (!c.line || byLine(c.line, f)));
  return {
    rows: [...rows].sort((a, b) => b.change_date.localeCompare(a.change_date)),
    matrix: CHANGE_CATEGORIES.map((cat) => {
      const mine = rows.filter((r) => r.category === cat.id);
      return {
        ...cat,
        total: mine.length,
        planned: mine.filter((r) => r.status === "planned").length,
        implemented: mine.filter((r) => r.status === "implemented").length,
        verified: mine.filter((r) => r.status === "verified").length,
        rejected: mine.filter((r) => r.status === "rejected").length,
        high: mine.filter((r) => r.risk === "high").length,
        pendingValidation: mine.filter((r) => r.result === "pending" && r.status !== "rejected").length,
        ng: mine.filter((r) => r.result === "ng").length
      };
    })
  };
}
