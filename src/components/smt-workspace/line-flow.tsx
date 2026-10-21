"use client";

import { useT } from "@/components/smt/smt-charts";

// Sơ đồ trạm của line (đọc từ trái sang phải). Trạm kiểm tra tô viền để thấy line có bao nhiêu "cửa" bắt lỗi.
const isInspection = (s: string) => /spi|aoi|axi|x-?ray/i.test(s);

export function LineFlow({ stations, bottleneck }: { stations: string[]; bottleneck?: string }) {
  const t = useT();
  return (
    <ol className="flex flex-wrap items-center gap-1 text-xs" aria-label={t("Sơ đồ trạm", "Station layout")}>
      {stations.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          <span
            className={`rounded-md border px-2 py-1 font-medium ${isInspection(s) ? "border-dashed" : ""}`}
            style={{ borderColor: isInspection(s) ? "var(--viz-1)" : "var(--border)", background: s === bottleneck ? "var(--viz-1-wash)" : undefined }}
            title={s === bottleneck ? t("Trạm nút thắt", "Bottleneck station") : undefined}
          >
            {s === bottleneck && "⏱ "}
            {s}
          </span>
          {i < stations.length - 1 && <span className="muted" aria-hidden>→</span>}
        </li>
      ))}
    </ol>
  );
}
