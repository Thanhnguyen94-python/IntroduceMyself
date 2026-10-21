"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LegendSwatch, useT } from "@/components/smt/smt-charts";

// Biểu đồ của SMT Workspace (SVG thuần). Cùng quy ước với smt-charts.tsx:
// màu theo thực thể cố định (Cơ bản = viz-1, M-AOI = viz-2, Pro = viz-3), 1 trục Y, có bảng số liệu,
// nhãn trực tiếp ở cuối đường (viz-3 dưới 3:1 trên nền sáng nên luôn kèm nhãn chữ).

export const TIER_COLOR: Record<string, string> = { basic: "var(--viz-1)", maoi: "var(--viz-2)", pro: "var(--viz-3)" };

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

function Frame({ title, legend, table, children }: { title: string; legend?: ReactNode; table: ReactNode; children: ReactNode }) {
  const t = useT();
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <figcaption className="font-semibold">{title}</figcaption>
        <button type="button" onClick={() => setShowTable((v) => !v)} className="text-xs font-semibold text-brand-600 dark:text-brand-300">
          {showTable ? t("Xem biểu đồ", "Show chart") : t("Xem dạng bảng", "Show table")}
        </button>
      </div>
      {legend && <div className="muted flex flex-wrap gap-4 text-xs">{legend}</div>}
      {showTable ? <div className="max-h-80 overflow-auto rounded-lg border text-sm" style={{ borderColor: "var(--border)" }}>{table}</div> : children}
    </figure>
  );
}

export type Series = { id: string; label: string; color: string };

// ---------- Nhiều đường cùng 1 trục (vd OEE theo tuần của 3 cấp line) ----------
export function MultiLineChart({ title, series, data, format, target, xLabel, percent = true }: { title: string; series: Series[]; data: Array<{ x: string; label: string; values: Record<string, number | undefined> }>; format: (v: number) => string; target?: number; xLabel: string; percent?: boolean }) {
  const t = useT();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 240;
  const pad = { l: 46, r: 64, t: 14, b: 26 };
  const values = data.flatMap((d) => series.map((s) => d.values[s.id]).filter((v): v is number => v !== undefined));
  let min = Math.min(...values, target ?? Infinity);
  let max = Math.max(...values, target ?? -Infinity);
  if (!values.length) [min, max] = [0, 1];
  const span = Math.max(max - min, percent ? 0.02 : 1);
  // Số đếm: trục bắt đầu từ 0 để chiều cao tỉ lệ với giá trị.
  min = percent ? Math.max(0, min - span * 0.2) : 0;
  max = percent ? Math.min(1, max + span * 0.2) : max + span * 0.15;
  const iw = width - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const x = (i: number) => pad.l + (data.length <= 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - ((v - min) / (max - min || 1)) * ih;
  const ticks = [min, (min + max) / 2, max];
  const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(iw / 60)));
  const path = (id: string) => {
    let d = "";
    let pen = false;
    data.forEach((p, i) => {
      const v = p.values[id];
      if (v === undefined) return void (pen = false);
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  // Nhãn cuối đường: tránh chồng nhau bằng cách đẩy cách nhau tối thiểu 13px.
  const ends = series
    .map((s) => {
      const i = [...data.keys()].reverse().find((k) => data[k].values[s.id] !== undefined);
      return i === undefined ? null : { s, i, v: data[i].values[s.id]!, y: y(data[i].values[s.id]!) };
    })
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 13) ends[k].y = ends[k - 1].y + 13;
  const h = hover !== null ? data[hover] : null;

  return (
    <Frame
      title={title}
      legend={
        <>
          {series.map((s) => (
            <LegendSwatch key={s.id} color={s.color} label={s.label} line />
          ))}
          {target !== undefined && <LegendSwatch color="var(--muted)" label={`${t("Mục tiêu", "Target")} ${format(target)}`} line dashed />}
        </>
      }
      table={
        <table className="w-full">
          <thead className="sticky top-0" style={{ background: "var(--surface)" }}>
            <tr className="muted text-left text-xs">
              <th className="px-3 py-2">{xLabel}</th>
              {series.map((s) => (
                <th key={s.id} className="px-3 py-2 text-right">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.x} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-3 py-1.5">{d.label}</td>
                {series.map((s) => (
                  <td key={s.id} className="px-3 py-1.5 text-right tabular-nums">
                    {d.values[s.id] === undefined ? "—" : format(d.values[s.id]!)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      }
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
          {series.map((s) => (
            <path key={s.id} d={path(s.id)} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {ends.map((e) => (
            <text key={e.s.id} x={x(e.i) + 6} y={e.y} dy="0.32em" fontSize="11" fontWeight="600" fill="var(--text)" className="tabular-nums">
              {format(e.v)} {e.s.label}
            </text>
          ))}
          {data.map((p, i) =>
            i % labelEvery === 0 || i === data.length - 1 ? (
              <text key={p.x} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">
                {p.label}
              </text>
            ) : null
          )}
          {h && hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--muted)" strokeWidth="1" />
              {series.map((s) => (h.values[s.id] !== undefined ? <circle key={s.id} cx={x(hover)} cy={y(h.values[s.id]!)} r="5" fill={s.color} stroke="var(--surface)" strokeWidth="2" /> : null))}
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
              setHover(Math.max(0, Math.min(data.length - 1, Math.round(((e.clientX - box.left) / box.width) * (data.length - 1)))));
            }}
          />
        </svg>
        {h && hover !== null && (
          <div className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs shadow-lg" style={{ top: pad.t, left: x(hover) > width * 0.6 ? undefined : x(hover) + 10, right: x(hover) > width * 0.6 ? width - x(hover) + 10 : undefined, background: "var(--surface)", borderColor: "var(--border)" }}>
            <span className="muted block">
              {xLabel} {h.label}
            </span>
            {series.map((s) => (
              <span key={s.id} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                <span className="font-semibold tabular-nums">{h.values[s.id] === undefined ? "—" : format(h.values[s.id]!)}</span>
                <span className="muted">{s.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </Frame>
  );
}

// ---------- So sánh 1 chỉ số giữa các nhóm: mỗi nhóm 1 thanh ngang, có nhãn giá trị ----------
export function CompareBars({ title, note, items, format, better = "high" }: { title: string; note?: string; items: Array<{ id: string; label: string; value: number; color: string }>; format: (v: number) => string; better?: "high" | "low" }) {
  const t = useT();
  const max = Math.max(1e-9, ...items.map((i) => i.value));
  const best = better === "high" ? Math.max(...items.map((i) => i.value)) : Math.min(...items.map((i) => i.value));
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-semibold">
        {title} {note && <span className="muted text-xs font-normal">· {note}</span>}
      </figcaption>
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.id} className="grid grid-cols-[84px_1fr_auto] items-center gap-2 text-sm" title={`${it.label}: ${format(it.value)}`}>
            <span className="truncate">{it.label}</span>
            <span className="h-2.5 rounded-full" style={{ background: "var(--viz-1-wash)" }}>
              <span className="block h-2.5 rounded-r-[4px]" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: it.color }} />
            </span>
            <span className="tabular-nums font-semibold">
              {format(it.value)}
              {items.length > 1 && it.value === best && <span className="ml-1 text-xs" aria-label={t("tốt nhất", "best")}>★</span>}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
