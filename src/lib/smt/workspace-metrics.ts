import { lineTier, LINE_TIERS, type LineTier } from "@/lib/smt/demo-config";
import { oeeOf, type OeeParts } from "@/lib/smt/metrics";
import { addDays, daysBetween } from "@/lib/smt/types";
import type { ProductionLog, SmtSettings } from "@/lib/smt/types";
import type { DefectSummary } from "@/lib/smt/workspace";

// Tổng hợp cho trang /smt (thuần, không I/O). Dùng lại công thức OEE / FPY / DPMO của metrics.ts.

// Nhóm trạm phát hiện: lỗi càng được bắt sớm thì sửa càng rẻ.
export const DETECT_GROUPS = [
  { id: "early", vi: "Trước lò (SPI, M-AOI)", en: "Before reflow (SPI, M-AOI)", points: ["SPI", "M-AOI"] },
  { id: "inline", vi: "Cuối line (AOI, AXI)", en: "End of line (AOI, AXI)", points: ["AOI", "AXI"] },
  { id: "visual", vi: "Kiểm tra ngoại quan", en: "Visual", points: ["Visual"] },
  { id: "test", vi: "Lọt xuống test (ICT, FCT)", en: "Escaped to test (ICT, FCT)", points: ["ICT", "FCT"] },
  { id: "customer", vi: "Lọt đến khách hàng", en: "Escaped to customer", points: ["Customer"] }
] as const;
export type DetectGroup = (typeof DETECT_GROUPS)[number]["id"];

const groupOf = (point: string): DetectGroup => DETECT_GROUPS.find((g) => (g.points as readonly string[]).includes(point))?.id ?? "inline";
const safe = (a: number, b: number) => (b > 0 ? a / b : 0);

export type KpiBlock = OeeParts & { boards: number; points: number; fpy: number; dpmo: number; escapes: number; escapePpm: number; detect: Record<DetectGroup, number> };

function kpis(logs: ProductionLog[], defects: DefectSummary[]): KpiBlock {
  const o = oeeOf(logs);
  const opp = logs.reduce((s, l) => s + l.total_qty * l.opportunities, 0);
  const points = defects.reduce((s, d) => s + d.qty, 0);
  const detect = Object.fromEntries(DETECT_GROUPS.map((g) => [g.id, 0])) as Record<DetectGroup, number>;
  for (const d of defects) detect[groupOf(d.detected_by)] += d.qty;
  const escapes = detect.test + detect.customer;
  return { ...o, boards: o.total, points, fpy: o.quality, dpmo: safe(points, opp) * 1e6, escapes, escapePpm: safe(detect.customer, o.total) * 1e6, detect };
}

// Thứ Hai đầu tuần (ISO).
export function weekStart(iso: string) {
  const day = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return addDays(iso, -((day + 6) % 7));
}

export function quarterOf(iso: string) {
  return `Q${Math.floor((Number(iso.slice(5, 7)) - 1) / 3) + 1}/${iso.slice(0, 4)}`;
}

export function buildOverview(production: ProductionLog[], defects: DefectSummary[], settings: SmtSettings, from: string, to: string) {
  const tierOf = new Map(settings.lines.map((l) => [l.code, lineTier(l)]));
  const tier = (line: string): LineTier => tierOf.get(line) ?? "basic";
  const months = (d: DefectSummary) => d.month >= from.slice(0, 7) && d.month <= to.slice(0, 7);
  const defs = defects.filter(months);

  const lines = settings.lines.map((l) => {
    const logs = production.filter((p) => p.line === l.code);
    const mine = defs.filter((d) => d.line === l.code);
    const byCode = new Map<string, number>();
    for (const d of mine) byCode.set(d.defect_code, (byCode.get(d.defect_code) ?? 0) + d.qty);
    const top = [...byCode].sort((a, b) => b[1] - a[1])[0];
    return { code: l.code, name: l.name, tier: lineTier(l), stations: l.stations, ...kpis(logs, mine), topDefect: top ? { code: top[0], qty: top[1] } : null, hasData: logs.length > 0 };
  });

  const tiers = LINE_TIERS.map((t) => {
    const codes = lines.filter((l) => l.tier === t.id).map((l) => l.code);
    return { ...t, lines: codes.length, ...kpis(production.filter((p) => codes.includes(p.line)), defs.filter((d) => codes.includes(d.line))) };
  }).filter((t) => t.lines > 0);

  // OEE theo tuần cho từng cấp line (chỉ tuần có dữ liệu).
  const weeks: string[] = [];
  for (let w = weekStart(from); w <= to; w = addDays(w, 7)) weeks.push(w);
  const weekly = weeks.map((w) => {
    const end = addDays(w, 6);
    const inW = production.filter((p) => p.log_date >= w && p.log_date <= end);
    const row: { week: string; values: Partial<Record<LineTier, number>> } = { week: w, values: {} };
    for (const t of tiers) {
      const logs = inW.filter((p) => tier(p.line) === t.id);
      if (logs.length) row.values[t.id] = oeeOf(logs).oee;
    }
    return row;
  });

  // So sánh theo quý.
  const quarterKeys = [...new Set(production.map((p) => quarterOf(p.log_date)))].sort((a, b) => a.slice(3).localeCompare(b.slice(3)) || a.localeCompare(b));
  const quarters = quarterKeys.map((q) => {
    const logs = production.filter((p) => quarterOf(p.log_date) === q);
    const qDefs = defs.filter((d) => quarterOf(`${d.month}-01`) === q);
    return {
      quarter: q,
      days: new Set(logs.map((l) => l.log_date)).size,
      all: kpis(logs, qDefs),
      tiers: Object.fromEntries(tiers.map((t) => [t.id, kpis(logs.filter((p) => tier(p.line) === t.id), qDefs.filter((d) => tier(d.line) === t.id))])) as Partial<Record<LineTier, KpiBlock>>
    };
  });

  const paretoMap = new Map<string, number>();
  for (const d of defs) paretoMap.set(d.defect_code, (paretoMap.get(d.defect_code) ?? 0) + d.qty);
  const total = kpis(production, defs);
  let cum = 0;
  const pareto = [...paretoMap]
    .sort((a, b) => b[1] - a[1])
    .map(([code, qty]) => {
      cum += qty;
      const cat = settings.defectCatalog.find((c) => c.code === code);
      return { code, label: cat?.vi ?? code, labelEn: cat?.en ?? code, qty, share: safe(qty, total.points), cumulative: safe(cum, total.points) };
    });

  const downMap = new Map<string, number>();
  for (const p of production) if (p.downtime_min > 0) downMap.set(p.downtime_reason || "Không ghi lý do", (downMap.get(p.downtime_reason || "Không ghi lý do") ?? 0) + p.downtime_min);
  const downtime = [...downMap].map(([reason, minutes]) => ({ reason, minutes })).sort((a, b) => b.minutes - a.minutes);

  return { total, lines, tiers, weekly, quarters, pareto, downtime, days: daysBetween(from, to) + 1 };
}

export type Overview = ReturnType<typeof buildOverview>;

// Kỳ xem: 30 / 90 ngày, quý hiện tại, toàn bộ.
export type RangeKey = "30" | "90" | "qtd" | "all";
export const RANGES: Array<{ id: RangeKey; vi: string; en: string }> = [
  { id: "30", vi: "30 ngày", en: "30 days" },
  { id: "90", vi: "90 ngày", en: "90 days" },
  { id: "qtd", vi: "Quý này", en: "This quarter" },
  { id: "all", vi: "Toàn bộ", en: "All" }
];

export function resolveRange(key: string | undefined, today: string, earliest: string): { key: RangeKey; from: string; to: string } {
  const k: RangeKey = key === "30" || key === "qtd" || key === "all" ? key : "90";
  const from = k === "30" ? addDays(today, -29) : k === "90" ? addDays(today, -89) : k === "qtd" ? `${today.slice(0, 5)}${String(Math.floor((Number(today.slice(5, 7)) - 1) / 3) * 3 + 1).padStart(2, "0")}-01` : earliest;
  return { key: k, from: from < earliest ? earliest : from, to: today };
}
