"use client";

import { useEffect, useState } from "react";
import { compact } from "@/lib/format-number";

// ===== Biểu đồ thống kê (1 chuỗi số liệu, màu --viz-1) =====

function niceMax(value: number) {
  if (value <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * pow >= value / 4)! * pow;
  return Math.ceil(value / step) * step;
}

// Cột theo ngày: hover/focus mỗi cột hiện tooltip; nhãn giá trị chỉ ở cột cao nhất.
// Mặc định: views = lượt xem, visitors = khách. Trang cửa hàng dùng lại với views = doanh thu, visitors = số đơn.
export function DailyColumns({
  data,
  title,
  unit = "lượt xem",
  secondaryUnit = "khách",
  valueFormat = "number"
}: {
  data: Array<{ date: string; views: number; visitors: number }>;
  title: string;
  unit?: string;
  secondaryUnit?: string;
  valueFormat?: "number" | "vnd";
}) {
  const fmt = (v: number) => (valueFormat === "vnd" ? `${compact(v)}₫` : compact(v));
  const full = (v: number) => (valueFormat === "vnd" ? `${v.toLocaleString("vi-VN")}₫` : String(v));
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = niceMax(Math.max(1, ...data.map((d) => d.views)));
  const peak = data.reduce((best, d, i) => (d.views > data[best].views ? i : best), 0);
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(data.length / 8);
  const height = 180;

  return (
    <figure className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <figcaption className="font-semibold">{title}</figcaption>
        <button type="button" onClick={() => setShowTable((v) => !v)} className="text-xs font-semibold text-brand-600 dark:text-brand-300">
          {showTable ? "Xem biểu đồ" : "Xem dạng bảng"}
        </button>
      </div>

      {showTable ? (
        <div className="max-h-72 overflow-y-auto rounded-lg border text-sm" style={{ borderColor: "var(--border)" }}>
          <table className="w-full">
            <thead className="sticky top-0" style={{ background: "var(--surface)" }}>
              <tr className="muted text-left text-xs">
                <th className="px-3 py-2">Ngày</th>
                <th className="px-3 py-2 text-right first-letter:uppercase">{unit}</th>
                <th className="px-3 py-2 text-right first-letter:uppercase">{secondaryUnit}</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-3 py-1.5">{d.date.slice(5).split("-").reverse().join("/")}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{full(d.views)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{d.visitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative pl-9">
          {/* Trục Y + lưới mảnh, nhạt */}
          <div className="absolute inset-y-0 left-0 w-9" style={{ height }}>
            {ticks.map((t) => (
              <span key={t} className="muted absolute right-2 -translate-y-1/2 text-[11px] tabular-nums" style={{ top: height - (t / max) * height }}>
                {compact(t)}
              </span>
            ))}
          </div>
          <div className="relative" style={{ height }}>
            {ticks.map((t) => (
              <div key={t} className="absolute inset-x-0 h-px" style={{ top: height - (t / max) * height, background: "var(--border)" }} />
            ))}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {data.map((d, i) => {
                const h = (d.views / max) * height;
                const active = hover === i;
                return (
                  <button
                    key={d.date}
                    type="button"
                    className="relative flex h-full min-w-0 flex-1 items-end justify-center focus:outline-none"
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    aria-label={`${d.date}: ${full(d.views)} ${unit}, ${d.visitors} ${secondaryUnit}`}
                  >
                    <span
                      className="block w-full max-w-[24px] rounded-t-[4px] transition-[filter]"
                      style={{ height: Math.max(d.views ? 2 : 0, h), background: "var(--viz-1)", filter: active ? "brightness(1.15)" : undefined }}
                    />
                    {i === peak && d.views > 0 && !active && (
                      <span className="absolute text-[11px] font-semibold tabular-nums" style={{ bottom: h + 4 }}>
                        {fmt(d.views)}
                      </span>
                    )}
                    {active && (
                      <span
                        className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-left text-xs shadow-lg ${
                          i > data.length * 0.75 ? "right-0" : i < data.length * 0.25 ? "left-0" : ""
                        }`}
                        // Luôn nằm trong vùng vẽ (tooltip cao ~60px), cột ở mép thì mở vào trong.
                        style={{ bottom: Math.min(h + 8, height - 64), background: "var(--surface)", borderColor: "var(--border)" }}
                      >
                        <span className="block font-bold tabular-nums">
                          {full(d.views)} {unit}
                        </span>
                        <span className="muted block tabular-nums">
                          {d.visitors} {secondaryUnit}
                        </span>
                        <span className="muted block">{d.date.slice(5).split("-").reverse().join("/")}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-1 flex gap-[2px]">
            {data.map((d, i) => (
              <span key={d.date} className="muted min-w-0 flex-1 text-center text-[10px]">
                {i % labelEvery === 0 || i === data.length - 1 ? d.date.slice(5).split("-").reverse().join("/") : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </figure>
  );
}

// Danh sách xếp hạng dạng thanh ngang: nhãn bên trái, giá trị ở đầu thanh (đọc được không cần hover).
export function BarList({ title, items, unit = "khách", empty = "Chưa có dữ liệu" }: { title: string; items: Array<{ label: string; value: number }>; unit?: string; empty?: string }) {
  const max = Math.max(1, ...items.map((it) => it.value));
  return (
    <section className="card space-y-3">
      <h3 className="font-semibold">{title}</h3>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.label} className="text-sm" title={`${it.label}: ${it.value} ${unit}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{it.label}</span>
                <span className="shrink-0 font-semibold tabular-nums">{compact(it.value)}</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full" style={{ background: "var(--viz-1-wash)" }}>
                <div className="h-2 rounded-r-[4px]" style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: "var(--viz-1)" }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted text-sm">{empty}</p>
      )}
    </section>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card">
      <p className="muted text-sm">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}

// Số người đang online, tự cập nhật 15 giây/lần.
export function OnlineNow({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    const timer = window.setInterval(() => {
      fetch("/api/admin/analytics/online", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { online?: number }) => typeof d.online === "number" && setCount(d.online))
        .catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="card">
      <p className="muted flex items-center gap-2 text-sm">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        Đang online
      </p>
      <p className="mt-1 text-5xl font-semibold tabular-nums">{count}</p>
      <p className="muted mt-1 text-xs">Hoạt động trong 2 phút gần nhất · tự cập nhật</p>
    </div>
  );
}
