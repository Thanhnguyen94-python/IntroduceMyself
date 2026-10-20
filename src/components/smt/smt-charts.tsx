"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { ddmm } from "@/lib/smt/types";

// ===== Biểu đồ báo cáo SMT (SVG thuần, không thư viện) =====
// Quy ước màu: --viz-1 = số liệu chính, --viz-2 = chuỗi thứ 2 (tích luỹ / tổn thất),
// --status-* chỉ dùng cho trạng thái và luôn đi kèm icon + chữ. 1 trục Y duy nhất cho mỗi biểu đồ.

export function useT() {
  const { lang } = useLanguage();
  return (vi: string, en: string) => (lang === "en" ? en : vi);
}

function useWidth<T extends HTMLElement>(initial = 640) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export type Status = "good" | "warning" | "critical";
const STATUS_ICON: Record<Status, string> = { good: "✓", warning: "!", critical: "✕" };

export function StatusBadge({ status, children }: { status: Status; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold" style={{ borderColor: `var(--status-${status})` }}>
      <span className="grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: `var(--status-${status})` }} aria-hidden>
        {STATUS_ICON[status]}
      </span>
      {children}
    </span>
  );
}

// Ô KPI: giá trị lớn + so với mục tiêu (đạt / chưa đạt).
export function KpiTile({ label, value, target, ok, hint }: { label: string; value: string; target?: string; ok?: boolean | null; hint?: string }) {
  const t = useT();
  return (
    <div className="card smt-block">
      <p className="muted text-sm">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {target && <span className="muted">{t("Mục tiêu", "Target")} {target}</span>}
        {ok !== undefined && ok !== null && <StatusBadge status={ok ? "good" : "critical"}>{ok ? t("Đạt", "On target") : t("Chưa đạt", "Below target")}</StatusBadge>}
      </div>
      {hint && <p className="muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}

function ChartFrame({ title, legend, table, children }: { title: string; legend?: ReactNode; table: ReactNode; children: ReactNode }) {
  const t = useT();
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <figcaption className="font-semibold">{title}</figcaption>
        <button type="button" onClick={() => setShowTable((v) => !v)} className="smt-no-print text-xs font-semibold text-brand-600 dark:text-brand-300">
          {showTable ? t("Xem biểu đồ", "Show chart") : t("Xem dạng bảng", "Show table")}
        </button>
      </div>
      {legend && <div className="muted flex flex-wrap gap-4 text-xs">{legend}</div>}
      {showTable ? <div className="max-h-80 overflow-auto rounded-lg border text-sm" style={{ borderColor: "var(--border)" }}>{table}</div> : children}
    </figure>
  );
}

export function LegendSwatch({ color, label, line = false, dashed = false }: { color: string; label: string; line?: boolean; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {line ? (
        <svg width="18" height="8" aria-hidden>
          <line x1="0" y1="4" x2="18" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "4 3" : undefined} />
        </svg>
      ) : (
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      )}
      {label}
    </span>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <table className="w-full">
      <thead className="sticky top-0" style={{ background: "var(--surface)" }}>
        <tr className="muted text-left text-xs">
          {head.map((h, i) => (
            <th key={h} className={`px-3 py-2 ${i ? "text-right" : ""}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
            {r.map((c, j) => (
              <td key={j} className={`px-3 py-1.5 ${j ? "text-right tabular-nums" : ""}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Tooltip({ x, width, top, children }: { x: number; width: number; top: number; children: ReactNode }) {
  // Mở vào phía trong khi gần mép để không tràn khung.
  const alignRight = x > width * 0.7;
  return (
    <div
      className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs shadow-lg"
      style={{ top, left: alignRight ? undefined : x + 10, right: alignRight ? width - x + 10 : undefined, background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {children}
    </div>
  );
}

// ---------- Xu hướng theo ngày (1 đường + đường mục tiêu nét đứt) ----------
export function TrendChart({
  title,
  data,
  target,
  format,
  label,
  percent = true,
  higherIsBetter = true
}: {
  title: string;
  data: Array<{ date: string; value: number; has: boolean }>;
  target?: number;
  format: (v: number) => string;
  label: string;
  percent?: boolean;
  higherIsBetter?: boolean;
}) {
  const t = useT();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 210;
  const pad = { l: 46, r: 12, t: 12, b: 26 };
  const values = data.filter((d) => d.has).map((d) => d.value);
  let min = Math.min(...values, target ?? Infinity);
  let max = Math.max(...values, target ?? -Infinity);
  if (!values.length) [min, max] = [0, 1];
  const span = Math.max(max - min, percent ? 0.02 : 1);
  min = Math.max(percent ? 0 : 0, min - span * 0.25);
  max = percent ? Math.min(1, max + span * 0.25) : max + span * 0.25;
  if (max <= min) max = min + 1;
  const iw = width - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - ((v - min) / (max - min)) * ih;
  const ticks = [min, (min + max) / 2, max];

  // Đường bị ngắt ở ngày không có dữ liệu.
  let d = "";
  let pen = false;
  data.forEach((p, i) => {
    if (!p.has) return void (pen = false);
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
    pen = true;
  });
  const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(iw / 56)));
  const last = [...data.keys()].reverse().find((i) => data[i].has);
  const h = hover !== null ? data[hover] : null;
  const missed = (v: number) => target !== undefined && (higherIsBetter ? v < target : v > target);

  return (
    <ChartFrame
      title={title}
      legend={
        <>
          <LegendSwatch color="var(--viz-1)" label={label} line />
          {target !== undefined && <LegendSwatch color="var(--muted)" label={`${t("Mục tiêu", "Target")} ${format(target)}`} line dashed />}
        </>
      }
      table={<SimpleTable head={[t("Ngày", "Date"), label]} rows={data.filter((p) => p.has).reverse().map((p) => [ddmm(p.date), format(p.value)])} />}
    >
      <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
        <svg width={width} height={H} role="img" aria-label={title} className="block">
          {ticks.map((tk) => (
            <g key={tk}>
              <line x1={pad.l} x2={width - pad.r} y1={y(tk)} y2={y(tk)} stroke="var(--border)" strokeWidth="1" />
              <text x={pad.l - 6} y={y(tk)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--muted)" className="tabular-nums">
                {format(tk)}
              </text>
            </g>
          ))}
          {target !== undefined && target >= min && target <= max && <line x1={pad.l} x2={width - pad.r} y1={y(target)} y2={y(target)} stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="5 4" />}
          <path d={d} fill="none" stroke="var(--viz-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {/* Điểm dưới mục tiêu: chấm có viền, để đọc được không cần màu */}
          {data.map((p, i) =>
            p.has && missed(p.value) ? <circle key={p.date} cx={x(i)} cy={y(p.value)} r="3.5" fill="var(--surface)" stroke="var(--viz-1)" strokeWidth="2" /> : null
          )}
          {last !== undefined && hover === null && (
            <text x={x(last)} y={y(data[last].value) - 9} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--text)" className="tabular-nums">
              {format(data[last].value)}
            </text>
          )}
          {data.map((p, i) =>
            (i % labelEvery === 0 && data.length - 1 - i >= labelEvery / 2) || i === data.length - 1 ? (
              <text key={p.date} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">
                {ddmm(p.date)}
              </text>
            ) : null
          )}
          {h && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--muted)" strokeWidth="1" />
              {h.has && <circle cx={x(hover)} cy={y(h.value)} r="5" fill="var(--viz-1)" stroke="var(--surface)" strokeWidth="2" />}
            </g>
          )}
          <rect
            x={pad.l}
            y={pad.t}
            width={iw}
            height={ih}
            fill="transparent"
            onPointerMove={(e) => {
              const box = (e.currentTarget as SVGRectElement).getBoundingClientRect();
              const rel = (e.clientX - box.left) / box.width;
              setHover(Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1)))));
            }}
          />
        </svg>
        {h && hover !== null && (
          <Tooltip x={x(hover)} width={width} top={pad.t}>
            <span className="block font-bold tabular-nums">{h.has ? format(h.value) : t("Không có dữ liệu", "No data")}</span>
            <span className="muted block">
              {label} · {ddmm(h.date)}
            </span>
          </Tooltip>
        )}
      </div>
    </ChartFrame>
  );
}

// ---------- Pareto: cột = % mỗi lỗi, đường = % tích luỹ (cùng trục %) ----------
export function ParetoChart({ title, items }: { title: string; items: Array<{ code: string; label: string; qty: number; share: number; cumulative: number }> }) {
  const t = useT();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  // Tối đa 10 cột, phần còn lại gộp "Khác" để không sinh màu / cột vô hạn.
  const shown = items.length > 10 ? [...items.slice(0, 9), { code: t("Khác", "Other"), label: t("Các lỗi còn lại", "Remaining defects"), qty: items.slice(9).reduce((s, x) => s + x.qty, 0), share: items.slice(9).reduce((s, x) => s + x.share, 0), cumulative: 1 }] : items;
  const H = 240;
  const pad = { l: 40, r: 12, t: 14, b: 30 };
  const iw = width - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const band = shown.length ? iw / shown.length : iw;
  const bw = Math.min(44, band * 0.62);
  const cx = (i: number) => pad.l + band * i + band / 2;
  const y = (v: number) => pad.t + ih - v * ih;
  const path = shown.map((s, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)},${y(s.cumulative).toFixed(1)}`).join("");
  const cross80 = shown.findIndex((s) => s.cumulative >= 0.8);
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  if (!shown.length) return <p className="muted text-sm">{t("Chưa có dữ liệu lỗi trong kỳ.", "No defect data in this period.")}</p>;

  return (
    <ChartFrame
      title={title}
      legend={
        <>
          <LegendSwatch color="var(--viz-1)" label={t("% số lỗi", "% of defects")} />
          <LegendSwatch color="var(--viz-2)" label={t("% tích luỹ", "Cumulative %")} line />
          <LegendSwatch color="var(--muted)" label={t("Ngưỡng 80%", "80% line")} line dashed />
        </>
      }
      table={<SimpleTable head={[t("Mã lỗi", "Code"), t("Số lỗi", "Qty"), "%", t("Tích luỹ", "Cum.")]} rows={items.map((s) => [`${s.code} · ${s.label}`, s.qty.toLocaleString("vi-VN"), pct(s.share), pct(s.cumulative)])} />}
    >
      <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
        <svg width={width} height={H} role="img" aria-label={title} className="block">
          {[0, 0.25, 0.5, 0.75, 1].map((tk) => (
            <g key={tk}>
              <line x1={pad.l} x2={width - pad.r} y1={y(tk)} y2={y(tk)} stroke="var(--border)" strokeWidth="1" />
              <text x={pad.l - 6} y={y(tk)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--muted)">
                {tk * 100}%
              </text>
            </g>
          ))}
          <line x1={pad.l} x2={width - pad.r} y1={y(0.8)} y2={y(0.8)} stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="5 4" />
          {shown.map((s, i) => {
            const top = y(s.share);
            return (
              <g key={s.code} onPointerEnter={() => setHover(i)}>
                {/* vùng hover rộng hơn cột */}
                <rect x={pad.l + band * i} y={pad.t} width={band} height={ih} fill="transparent" />
                <path
                  d={`M${cx(i) - bw / 2},${y(0)} V${top + 4} q0,-4 4,-4 H${cx(i) + bw / 2 - 4} q4,0 4,4 V${y(0)} Z`}
                  fill="var(--viz-1)"
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
                <text x={cx(i)} y={H - 10} textAnchor="middle" fontSize="11" fontWeight={i <= cross80 ? 600 : 400} fill={i <= cross80 ? "var(--text)" : "var(--muted)"}>
                  {s.code}
                </text>
              </g>
            );
          })}
          <path d={path} fill="none" stroke="var(--viz-2)" strokeWidth="2" strokeLinejoin="round" pointerEvents="none" />
          {shown.map((s, i) => (
            <circle key={s.code} cx={cx(i)} cy={y(s.cumulative)} r={hover === i ? 5 : 3.5} fill="var(--viz-2)" stroke="var(--surface)" strokeWidth="2" pointerEvents="none" />
          ))}
          {hover === null && (
            <text x={cx(0)} y={y(shown[0].share) - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)">
              {pct(shown[0].share)}
            </text>
          )}
          {cross80 >= 0 && hover === null && (
            <text x={cx(cross80) + 8} y={y(shown[cross80].cumulative) + 14} fontSize="11" fontWeight="600" fill="var(--text)">
              {pct(shown[cross80].cumulative)}
            </text>
          )}
        </svg>
        {hover !== null && shown[hover] && (
          <Tooltip x={cx(hover)} width={width} top={pad.t}>
            <span className="block font-bold">
              {shown[hover].code} · {shown[hover].label}
            </span>
            <span className="block tabular-nums">
              {shown[hover].qty.toLocaleString("vi-VN")} {t("lỗi", "defects")} · {pct(shown[hover].share)}
            </span>
            <span className="muted block tabular-nums">
              {t("Tích luỹ", "Cumulative")} {pct(shown[hover].cumulative)}
            </span>
          </Tooltip>
        )}
      </div>
    </ChartFrame>
  );
}

// ---------- Line balance: CT từng trạm + đường takt; bottleneck có nhãn ----------
export function BalanceChart({ title, stations, takt, bottleneck }: { title: string; stations: Array<{ station: string; ct: number }>; takt: number; bottleneck: string }) {
  const t = useT();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 230;
  const pad = { l: 40, r: 12, t: 22, b: 44 };
  const iw = width - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const max = Math.max(1, takt, ...stations.map((s) => s.ct)) * 1.12;
  const band = iw / Math.max(1, stations.length);
  const bw = Math.min(46, band * 0.62);
  const cx = (i: number) => pad.l + band * i + band / 2;
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = [0, max / 2, max].map((v) => Math.round(v));
  const short = (s: string) => (s.length > 10 && band < 80 ? `${s.slice(0, 9)}…` : s);

  return (
    <ChartFrame
      title={title}
      legend={
        <>
          <LegendSwatch color="var(--viz-1)" label={t("Cycle time trạm (s)", "Station cycle time (s)")} />
          <LegendSwatch color="var(--status-critical)" label="Bottleneck" />
          {takt > 0 && <LegendSwatch color="var(--muted)" label={`Takt ${takt}s`} line dashed />}
        </>
      }
      table={<SimpleTable head={[t("Trạm", "Station"), "CT (s)", "% Takt"]} rows={stations.map((s) => [`${s.station}${s.station === bottleneck ? " ◀ bottleneck" : ""}`, s.ct.toFixed(1), takt ? `${((s.ct / takt) * 100).toFixed(0)}%` : "—"])} />}
    >
      <div ref={ref} className="relative" onPointerLeave={() => setHover(null)}>
        <svg width={width} height={H} role="img" aria-label={title} className="block">
          {ticks.map((tk) => (
            <g key={tk}>
              <line x1={pad.l} x2={width - pad.r} y1={y(tk)} y2={y(tk)} stroke="var(--border)" strokeWidth="1" />
              <text x={pad.l - 6} y={y(tk)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--muted)">
                {tk}s
              </text>
            </g>
          ))}
          {stations.map((s, i) => {
            const isB = s.station === bottleneck;
            const top = y(s.ct);
            return (
              <g key={s.station} onPointerEnter={() => setHover(i)}>
                <rect x={pad.l + band * i} y={pad.t} width={band} height={ih} fill="transparent" />
                <path d={`M${cx(i) - bw / 2},${y(0)} V${top + 4} q0,-4 4,-4 H${cx(i) + bw / 2 - 4} q4,0 4,4 V${y(0)} Z`} fill={isB ? "var(--status-critical)" : "var(--viz-1)"} opacity={hover === null || hover === i ? 1 : 0.55} />
                {isB && (
                  <text x={cx(i)} y={top - 6} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text)">
                    ⚠ {s.ct.toFixed(1)}s
                  </text>
                )}
                <text x={cx(i)} y={H - 26} textAnchor="middle" fontSize="10.5" fill="var(--text)">
                  {short(s.station)}
                </text>
                <text x={cx(i)} y={H - 12} textAnchor="middle" fontSize="10" fill="var(--muted)" className="tabular-nums">
                  {s.ct.toFixed(1)}s
                </text>
              </g>
            );
          })}
          {takt > 0 && (
            <g pointerEvents="none">
              <line x1={pad.l} x2={width - pad.r} y1={y(takt)} y2={y(takt)} stroke="var(--muted)" strokeWidth="1.5" strokeDasharray="5 4" />
              <text x={width - pad.r} y={y(takt) - 5} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--muted)">
                Takt {takt}s
              </text>
            </g>
          )}
        </svg>
        {hover !== null && stations[hover] && (
          <Tooltip x={cx(hover)} width={width} top={pad.t}>
            <span className="block font-bold">{stations[hover].station}</span>
            <span className="block tabular-nums">CT {stations[hover].ct.toFixed(1)}s</span>
            {takt > 0 && <span className="muted block tabular-nums">{((stations[hover].ct / takt) * 100).toFixed(0)}% takt</span>}
          </Tooltip>
        )}
      </div>
    </ChartFrame>
  );
}

// ---------- Thác tổn thất thời gian: Kế hoạch → trừ từng tổn thất → thời gian tạo giá trị ----------
export function LossWaterfall({ title, planned, losses }: { title: string; planned: number; losses: { downtime: number; speed: number; quality: number; valuable: number } }) {
  const t = useT();
  const [ref, width] = useWidth<HTMLDivElement>();
  const steps = [
    { label: t("Kế hoạch", "Planned"), value: planned, start: 0, kind: "total" },
    { label: t("Dừng máy", "Downtime"), value: losses.downtime, start: planned - losses.downtime, kind: "loss" },
    { label: t("Chậm tốc độ", "Speed loss"), value: losses.speed, start: planned - losses.downtime - losses.speed, kind: "loss" },
    { label: t("Lỗi chất lượng", "Quality loss"), value: losses.quality, start: losses.valuable, kind: "loss" },
    { label: t("Tạo giá trị (OEE)", "Valuable (OEE)"), value: losses.valuable, start: 0, kind: "total" }
  ];
  const H = 220;
  const pad = { l: 12, r: 12, t: 22, b: 30 };
  const iw = width - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const band = iw / steps.length;
  const bw = Math.min(64, band * 0.6);
  const y = (v: number) => pad.t + ih - (planned ? v / planned : 0) * ih;
  const fmtH = (min: number) => (min >= 600 ? `${(min / 60).toFixed(0)}h` : `${Math.round(min)}′`);

  return (
    <ChartFrame
      title={title}
      legend={
        <>
          <LegendSwatch color="var(--viz-1)" label={t("Thời gian", "Time")} />
          <LegendSwatch color="var(--viz-2)" label={t("Tổn thất", "Loss")} />
        </>
      }
      table={<SimpleTable head={[t("Hạng mục", "Item"), t("Phút", "Minutes"), "%"]} rows={steps.map((s) => [s.label, Math.round(s.value).toLocaleString("vi-VN"), planned ? `${((s.value / planned) * 100).toFixed(1)}%` : "—"])} />}
    >
      <div ref={ref}>
        <svg width={width} height={H} role="img" aria-label={title} className="block">
          <line x1={pad.l} x2={width - pad.r} y1={y(0)} y2={y(0)} stroke="var(--border)" />
          {steps.map((s, i) => {
            const x = pad.l + band * i + (band - bw) / 2;
            const top = y(s.start + s.value);
            const h = Math.max(1, y(s.start) - top);
            return (
              <g key={s.label}>
                <rect x={x} y={top} width={bw} height={h} rx="3" fill={s.kind === "total" ? "var(--viz-1)" : "var(--viz-2)"} />
                {i < steps.length - 1 && <line x1={x + bw} x2={x + band} y1={s.kind === "total" ? top : y(s.start)} y2={s.kind === "total" ? top : y(s.start)} stroke="var(--muted)" strokeDasharray="2 3" />}
                <text x={x + bw / 2} y={top - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--text)" className="tabular-nums">
                  {s.kind === "loss" ? "−" : ""}
                  {fmtH(s.value)} · {planned ? `${((s.value / planned) * 100).toFixed(0)}%` : ""}
                </text>
                <text x={x + bw / 2} y={H - 10} textAnchor="middle" fontSize="10.5" fill="var(--muted)">
                  {s.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </ChartFrame>
  );
}

// ---------- Thanh ngang xếp hạng (nhãn trái, giá trị phải) ----------
export function RankBars({ title, items, format = (v) => v.toLocaleString("vi-VN"), empty, highlight }: { title: string; items: Array<{ label: string; value: number; note?: string }>; format?: (v: number) => string; empty?: string; highlight?: (label: string) => boolean }) {
  const t = useT();
  const max = Math.max(1e-9, ...items.map((i) => i.value));
  return (
    <figure className="space-y-3">
      <figcaption className="font-semibold">{title}</figcaption>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.label} className="text-sm" title={`${it.label}: ${format(it.value)}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">
                  {it.label}
                  {it.note && <span className="muted ml-1 text-xs">{it.note}</span>}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{format(it.value)}</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full" style={{ background: "var(--viz-1-wash)" }}>
                <div className="h-2 rounded-r-[4px]" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: highlight?.(it.label) ? "var(--status-critical)" : "var(--viz-1)" }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted text-sm">{empty ?? t("Chưa có dữ liệu.", "No data.")}</p>
      )}
    </figure>
  );
}
